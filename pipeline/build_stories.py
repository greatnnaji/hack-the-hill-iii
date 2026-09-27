"""Turn the picked spending jumps into feed stories in the shared shape (TASKS.md "Shared contract").

Reads pipeline/picked.csv (from find_jumps.py) + raw GC InfoBase CSVs in pipeline/data/, and writes
pipeline/stories.json. Headlines/summaries come from the title/summary columns in picked.csv when
filled in; otherwise Claude drafts them when ANTHROPIC_API_KEY is set (cached in pipeline/llm_cache.json
so each story is generated once); otherwise a plain template is used.

Usage:
  python3 pipeline/build_stories.py            # build stories.json
  python3 pipeline/build_stories.py --push     # also POST to $SPENDING_API_URL/internal/spending
"""

import argparse
import hashlib
import json
import os
import urllib.request
from pathlib import Path

import pandas as pd
from pydantic import BaseModel

from find_jumps import fy, load
from make_images import image_url

HERE = Path(__file__).parent
CACHE = HERE / "llm_cache.json"
OUT = HERE / "stories.json"

YEAR_FROM, YEAR_TO = 2022, 2024
MODEL = "claude-opus-5"
SOURCE = {
    "label": "GC InfoBase: Federal Programs Spending",
    "url": "https://open.canada.ca/data/en/dataset/a35cf382-690c-4221-a971-cf0fd189a46f",
}


def money(v):
    """3264727280 -> '$3.3 billion', 318000000 -> '$318 million'."""
    return f"${v / 1e9:.1f} billion" if abs(v) >= 1e9 else f"${v / 1e6:.0f} million"


def change_phrase(old, new):
    """Deterministic wording of the change, so headlines never misstate the multiple."""
    r = new / old
    if r >= 4:
        return f"grew more than {int(r)}-fold"
    if r >= 3:
        return "more than tripled"
    if r >= 2:
        return "more than doubled"
    if r >= 1.5:
        return f"rose {round((r - 1) * 100)}%"
    if r <= 0.25:
        return f"fell {round((1 - r) * 100)}%"
    if r <= 0.5:
        return "was cut by more than half"
    return f"fell {round((1 - r) * 100)}%"


class Draft(BaseModel):
    title: str
    summary: str


PROMPT = """You write headlines for a Canadian app that shows people where their federal taxes go.

Write a headline and a short summary for this spending change. Use only the facts below. Do not
guess why the spending changed, name politicians, or add numbers that aren't here.

- Department: {department}
- Program (official name): {program}
- Suggested plain name: {plain_name}
- {fy_from}: {old}
- {fy_mid}: {mid}
- {fy_to}: {new}
- Change from {fy_from} to {fy_to}: {phrase}

Headline: plain English, neutral, at most 80 characters. Use the plain name, not the official
one. Use the change wording given above.
Summary: 2 sentences, neutral tone. Say what the program pays for in everyday words (only if it's
clear from the name) and state the numbers."""


def template_draft(f):
    direction = "up" if f["new_v"] >= f["old_v"] else "down"
    return Draft(
        title=f"Spending on {f['plain_name']} {f['phrase']} in two years",
        summary=(
            f"{f['department']} spent {f['new']} on {f['plain_name']} in {f['fy_to']}, "
            f"{direction} from {f['old']} in {f['fy_from']}. Official program name: {f['program']}."
        ),
    )


def llm_draft(client, f):
    response = client.messages.parse(
        model=MODEL,
        max_tokens=16000,
        output_config={"effort": "low"},
        messages=[{"role": "user", "content": PROMPT.format(**f)}],
        output_format=Draft,
        # On a safety decline, let the API retry on its recommended fallback model.
        extra_headers={"anthropic-beta": "server-side-fallback-2026-07-01"},
        extra_body={"fallbacks": "default"},
    )
    if response.stop_reason == "refusal" or response.parsed_output is None:
        return None
    return response.parsed_output


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--push", action="store_true", help="POST stories to $SPENDING_API_URL/internal/spending")
    args = ap.parse_args()

    picked = pd.read_csv(HERE / "picked.csv", keep_default_na=False)
    df, years = load(YEAR_FROM, YEAR_TO)
    exact = df.pivot_table(index=["dept_code", "program_code"], columns="year", values="expenditure", aggfunc="sum")

    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    client = None
    if os.environ.get("ANTHROPIC_API_KEY"):
        import anthropic

        client = anthropic.Anthropic()
    else:
        print("No ANTHROPIC_API_KEY: stories without a hand-written title use the template.")

    stories = []
    for _, p in picked.iterrows():
        row = exact.loc[(p["dept_code"], p["program_code"])]
        old_v, mid_v, new_v = row[years[0]], row[years[1]], row[years[-1]]
        f = {
            "department": p["department"],
            "program": p["program"],
            "plain_name": p["plain_name"],
            "fy_from": fy(years[0]), "fy_mid": fy(years[1]), "fy_to": fy(years[-1]),
            "old": money(old_v), "mid": money(mid_v), "new": money(new_v),
            "old_v": old_v, "new_v": new_v,
            "phrase": change_phrase(old_v, new_v),
        }

        # Hand-written title/summary in picked.csv wins over LLM drafts and the template.
        if p.get("title") and p.get("summary"):
            draft = Draft(title=p["title"], summary=p["summary"])
        else:
            # Cache key changes if the facts change, so edited data gets a fresh draft.
            key = hashlib.sha256(PROMPT.format(**f).encode()).hexdigest()[:16]
            draft = Draft(**cache[key]) if key in cache else None
        if draft is None and client:
            draft = llm_draft(client, f)
            if draft:
                cache[key] = draft.model_dump()
                CACHE.write_text(json.dumps(cache, indent=2))
        draft = draft or template_draft(f)

        stories.append({
            "id": f"data-{p['dept_code']}-{p['program_code']}-{years[-1]}".lower(),
            "title": draft.title,
            "summary": draft.summary,
            "amount": round(float(new_v)),
            "date": f"{years[-1] + 1}-03-31",
            "fiscal_year": fy(years[-1]),
            "department": p["department"],
            "dept_code": p["dept_code"],
            "program_code": p["program_code"],
            "source_type": "data",
            "level": "federal",
            "sources": [SOURCE],
            "image_url": image_url(p["dept_code"]),
        })

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(stories, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(stories)} stories to {OUT}")

    if args.push:
        push(stories)


def push(stories):
    """POST stories to $SPENDING_API_URL/internal/spending (also used by build_news.py)."""
    url, secret = os.environ["SPENDING_API_URL"].rstrip("/"), os.environ["INTERNAL_SECRET"]
    req = urllib.request.Request(
        f"{url}/internal/spending",
        data=json.dumps(stories).encode(),
        headers={"Content-Type": "application/json", "X-Internal-Secret": secret},
        method="POST",
    )
    with urllib.request.urlopen(req) as res:
        print(f"Pushed to {url}/internal/spending: HTTP {res.status}")


if __name__ == "__main__":
    main()
