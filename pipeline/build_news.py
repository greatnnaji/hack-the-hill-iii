"""Turn saved news articles into feed stories in the shared shape (Task 2, Phase 2).

Reads pipeline/news_raw.json (from fetch_news.py). Gemini reads each headline and pulls out the amount,
department, program and level, and writes a neutral headline + summary. Anything that isn't Canadian
federal spending (provincial, foreign, not about spending) is dropped. Gemini's answers are cached in
pipeline/news_llm_cache.json so each article is read once. The same story from several outlets is
merged into one, with every outlet kept as a source. Writes pipeline/news_stories.json.

Needs GEMINI_API_KEY (in the environment or the repo's .env).

Usage:
  python3 pipeline/build_news.py            # build news_stories.json
"""

import hashlib
import json
import os
import re
import time
from collections import Counter
from datetime import date
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel

from find_jumps import load
from make_images import image_url

HERE = Path(__file__).parent
RAW = HERE / "news_raw.json"
CACHE = HERE / "news_llm_cache.json"
OUT = HERE / "news_stories.json"

# Tried in order; a busy (503) or out-of-quota (429) model falls through to the next. All busy -> wait and retry.
MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"]
ROUNDS, WAIT_S = 3, 30
BATCH = 30
CATALOG_YEAR = 2024


class Extraction(BaseModel):
    article_id: str
    level: Literal["federal", "provincial", "municipal", "foreign", "not_spending"]
    amount_cad: Optional[int]
    dept_code: Optional[str]
    program_code: Optional[str]
    title: str
    summary: str


SYSTEM = """You read Canadian news headlines for an app that shows people where their federal taxes go.

For each headline, decide:
- level: "federal" only if the Government of Canada is spending, investing, granting, or awarding a
  contract with its own money. "provincial" / "municipal" if a province or city is paying. "foreign"
  if another country's government is paying (e.g. a Canadian company winning a US contract).
  "not_spending" for anything else (opinion, policy, sports contracts, reference pages). Also
  "not_spending" for Crown corporations that lend or invest on commercial terms with their own money
  (Farm Credit Canada, Business Development Bank of Canada, Export Development Canada, Canada Growth
  Fund): that isn't tax money.
- amount_cad: the federal dollars in the headline, as a whole number of Canadian dollars
  ("$76 million" -> 76000000, "nearly $7.5 million" -> 7500000). If the headline gives only a combined
  federal + provincial total, a foreign currency, or no amount, use null.
- dept_code: the department paying, from the list below. null if you can't tell.
- program_code: the program from the list below that clearly covers this spending. Must belong to
  dept_code. null unless the match is clear.
- title: a neutral, plain-English headline in sentence case (not Title Case), at most 80
  characters. Keep the amount.
- summary: 1-2 neutral sentences using only facts in the headline. Don't guess reasons, add numbers,
  or name politicians.

Return one result per headline, with the same article_id.

Federal programs ({year}), one per line as dept_code | program_code | department | program:
{catalog}"""


def env_key():
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ["GEMINI_API_KEY"]
    env = HERE.parent / ".env"
    for line in env.read_text().splitlines() if env.exists() else []:
        k, _, v = line.partition("=")
        if k.strip() == "GEMINI_API_KEY":
            return v.strip()
    raise SystemExit("GEMINI_API_KEY not set (environment or .env)")


def fiscal_year(date):
    """'2026-09-16' -> '2026-27' (federal fiscal year starts April 1)."""
    y, m = int(date[:4]), int(date[5:7])
    start = y if m >= 4 else y - 1
    return f"{start}-{(start + 1) % 100:02d}"


def catalog():
    df, _ = load(CATALOG_YEAR - 1, CATALOG_YEAR)
    df = df[(df["year"] == CATALOG_YEAR) & (df["expenditure"] > 0) & (df["program_code"] != "ISS")]
    df = df.dropna(subset=["name_en"]).drop_duplicates(["dept_code", "program_code"])
    programs = {(r.dept_code, r.program_code): r.name_en for r in df.itertuples()}
    depts = dict(zip(df["dept_code"], df["dept_name"]))
    lines = "\n".join(f"{d} | {p} | {depts[d]} | {n}" for (d, p), n in sorted(programs.items()))
    return programs, depts, lines


# Words too common in spending headlines to tell two stories apart.
STOPWORDS = set("""a an and at by for from in into of on or the to with over up nearly more than about
new canada canadian canada's federal government ottawa feds invests invest investing investment
announces announced funding receives million billion m b support boost gets provides""".split())
SAME_AMOUNT, SAME_DAYS = 0.02, 14


def words(text):
    return {w for w in re.findall(r"[a-z][a-z'.-]+", text.lower()) if w not in STOPWORDS}


def same_event(a, b):
    """Same amount (within 2%), within 14 days, and at least one distinctive word in common."""
    if abs(a["amount"] - b["amount"]) > SAME_AMOUNT * max(a["amount"], b["amount"]):
        return False
    if abs((date.fromisoformat(a["date"]) - date.fromisoformat(b["date"])).days) > SAME_DAYS:
        return False
    return bool(a["_words"] & b["_words"])


def dedupe(stories):
    """Merge the same story from different outlets into one, keeping every outlet as a source."""
    group = list(range(len(stories)))

    def root(i):
        while group[i] != i:
            i = group[i]
        return i

    for i in range(len(stories)):
        for j in range(i):
            if same_event(stories[i], stories[j]):
                group[root(i)] = root(j)

    merged = []
    for members in {r: [s for k, s in enumerate(stories) if root(k) == r] for r in map(root, range(len(stories)))}.values():
        # Outlets can disagree on the department; go with the majority, then the earliest article.
        dept = Counter(s["dept_code"] for s in members).most_common(1)[0][0]
        pick = min((s for s in members if s["dept_code"] == dept), key=lambda s: (s["program_code"] is None, s["date"]))
        sources = []
        for s in sorted(members, key=lambda s: s["date"]):
            sources += [src for src in s["sources"] if src["label"] not in {x["label"] for x in sources}]
        # Campaigns point at story ids, so the id comes from the earliest article: a newer outlet never changes it.
        first = min(members, key=lambda s: (s["date"], s["id"]))
        merged.append(pick | {"id": first["id"], "date": first["date"], "sources": sources})
    for s in merged:
        s.pop("_words")
    return sorted(merged, key=lambda s: s["date"], reverse=True)


def extract(client, system, articles):
    from google.genai import errors, types

    # Short ids: Gemini garbles Google's long base64 ids when echoing them back.
    prompt = "\n".join(f"{i}: {a['title']} ({a['outlet']}, {a['published']})" for i, a in enumerate(articles))
    config = types.GenerateContentConfig(
        system_instruction=system,
        response_mime_type="application/json",
        response_schema=list[Extraction],
        temperature=0,
    )
    for round_ in range(ROUNDS):
        for model in MODELS:
            try:
                return client.models.generate_content(model=model, contents=prompt, config=config).parsed or []
            except errors.APIError as e:
                if e.code not in (429, 503):
                    raise
                print(f"  {model} unavailable ({e.code}), trying next")
        if round_ < ROUNDS - 1:
            time.sleep(WAIT_S)
    raise SystemExit("All Gemini models busy, try again later (cached results are kept)")


def main():
    articles = json.loads(RAW.read_text())
    programs, depts, lines = catalog()
    system = SYSTEM.format(year=CATALOG_YEAR, catalog=lines)
    # Cache is keyed on the prompt, so editing it re-reads every article.
    version = hashlib.sha256(f"{MODELS}\n{system}".encode()).hexdigest()[:12]
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    cache = cache if cache.get("version") == version else {"version": version, "results": {}}
    results = cache["results"]

    todo = [a for a in articles if a["id"] not in results]
    if todo:
        from google import genai

        client = genai.Client(api_key=env_key())
        print(f"Reading {len(todo)} new articles with Gemini ({len(articles) - len(todo)} cached)")
        for i in range(0, len(todo), BATCH):
            batch = todo[i : i + BATCH]
            for e in extract(client, system, batch):
                if e.article_id.isdigit() and int(e.article_id) < len(batch):
                    results[batch[int(e.article_id)]["id"]] = e.model_dump() | {"article_id": batch[int(e.article_id)]["id"]}
            CACHE.write_text(json.dumps(cache, indent=2, ensure_ascii=False) + "\n")
            print(f"  {min(i + BATCH, len(todo))}/{len(todo)}")

    stories, dropped = [], {}
    for a in articles:
        e = results.get(a["id"])
        reason = (
            "not read" if e is None
            else e["level"] if e["level"] != "federal"
            else "no amount" if not e["amount_cad"]
            else "no department" if e["dept_code"] not in depts
            else None
        )
        if reason:
            dropped[reason] = dropped.get(reason, 0) + 1
            continue
        program = e["program_code"] if (e["dept_code"], e["program_code"]) in programs else None
        stories.append({
            "id": "news-" + hashlib.sha256(a["id"].encode()).hexdigest()[:12],
            "title": e["title"],
            "summary": e["summary"],
            "amount": e["amount_cad"],
            "date": a["published"],
            "fiscal_year": fiscal_year(a["published"]),
            "department": depts[e["dept_code"]],
            "dept_code": e["dept_code"],
            "program_code": program,
            "source_type": "news",
            "level": "federal",
            "sources": [{"label": a["outlet"], "url": a["link"]}],
            "image_url": image_url(e["dept_code"]),
            "_words": words(a["title"]) | words(e["title"]),
        })

    found = len(stories)
    stories = dedupe(stories)
    OUT.write_text(json.dumps(stories, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(stories)} stories to {OUT.relative_to(HERE.parent)} ({found - len(stories)} duplicates merged)")
    print("Dropped: " + ", ".join(f"{n} {r}" for r, n in sorted(dropped.items(), key=lambda x: -x[1])))


if __name__ == "__main__":
    main()
