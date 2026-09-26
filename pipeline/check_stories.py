"""Check every story in pipeline/stories.json against the raw GC InfoBase data (Phase 3 hand-check helper).

For each story: amount matches the data, every dollar figure and year in the summary is real, the
headline's change claim (e.g. "more than tripled", "fell 87%") is true, and the headline is <= 80 chars.
Also prints "your share" for a sample taxpayer so odd-looking numbers stand out.

Usage: python3 pipeline/check_stories.py [--tax 9510]
"""

import argparse
import json
import re
import sys
from pathlib import Path

from build_stories import YEAR_FROM, YEAR_TO, money
from find_jumps import fy, load

HERE = Path(__file__).parent


def check_claim(title, r):
    """Return an error string if the headline's change claim doesn't match ratio r (new / old)."""
    t = title.lower()
    up = any(w in t for w in ("rose", "grew", "doubled", "tripled", "up "))
    down = any(w in t for w in ("fell", "cut", "down "))
    if up and r <= 1 or down and r >= 1:
        return "direction is wrong"
    if "more than doubled" in t and not r >= 2:
        return "not more than doubled"
    if "more than tripled" in t and not r >= 3:
        return "not more than tripled"
    if (m := re.search(r"more than (\d+)-fold", t)) and not r >= int(m.group(1)):
        return f"not more than {m.group(1)}-fold"
    if "more than half" in t and not r <= 0.5:
        return "not cut by more than half"
    if m := re.search(r"(\d+)%", t):
        pct = round(abs(r - 1) * 100)
        if int(m.group(1)) != pct:
            return f"says {m.group(1)}%, data says {pct}%"
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tax", type=float, default=9510, help="sample federal tax paid, for 'your share'")
    args = ap.parse_args()

    stories = json.loads((HERE / "stories.json").read_text())
    df, years = load(YEAR_FROM, YEAR_TO)
    exact = df.pivot_table(index=["dept_code", "program_code"], columns="year", values="expenditure", aggfunc="sum")
    total = df[df["year"] == YEAR_TO]["expenditure"].sum()
    real_years = {fy(y) for y in years}

    failed = 0
    print(f"Total federal spending {fy(YEAR_TO)}: ${total / 1e9:.1f}B. Sample tax: ${args.tax:,.0f}\n")
    for s in stories:
        row = exact.loc[(s["dept_code"], s["program_code"])]
        values = {y: row[y] for y in years}
        errors = []

        if s["amount"] != round(float(values[YEAR_TO])):
            errors.append(f"amount {s['amount']} != data {values[YEAR_TO]:.0f}")
        if len(s["title"]) > 80:
            errors.append(f"title is {len(s['title'])} chars")
        if err := check_claim(s["title"], values[YEAR_TO] / values[YEAR_FROM]):
            errors.append(f"headline: {err}")

        real_money = {money(v) for v in values.values()}
        for fig in re.findall(r"\$[\d.]+ (?:billion|million)", s["summary"]):
            if fig not in real_money:
                errors.append(f"summary figure {fig} not in data {sorted(real_money)}")
        for yr in re.findall(r"\d{4}-\d{2}", s["summary"]):
            if yr not in real_years:
                errors.append(f"summary year {yr} not in {sorted(real_years)}")

        share = args.tax * s["amount"] / total
        status = "OK  " if not errors else "FAIL"
        failed += bool(errors)
        print(f"{status} ${share:7.2f}  {s['title']}")
        for e in errors:
            print(f"       - {e}")

    print(f"\n{len(stories) - failed}/{len(stories)} stories passed.")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
