"""Build the screen 02 breakdown: total federal spending and the 7 biggest programs (TASKS.md Raphael Task 1, Phase 2).

Reads the GC InfoBase CSVs in pipeline/data/ (see VERIFIED_SOURCES.md) and writes src/shared/breakdown.json.
Uses only the standard library, so no install is needed.

Usage:
  python pipeline/build_breakdown.py              # fiscal year 2024-25
  python pipeline/build_breakdown.py --year 2023  # another year (every top program needs a plain name first)
"""

import argparse
import csv
import json
from pathlib import Path

HERE = Path(__file__).parent
DATA = HERE / "data"
OUT = HERE.parent / "src" / "shared" / "breakdown.json"

TOP_N = 7
SOURCE = {
    "label": "GC InfoBase: Federal Programs Spending",
    "url": "https://open.canada.ca/data/en/dataset/a35cf382-690c-4221-a971-cf0fd189a46f",
}

# Hand-written plain-English names, keyed by (dept_code, program_code). Reviewed by a person before the demo.
PLAIN_NAMES = {
    ("HRSD", "BGN01"): ("Old Age Security pensions", "Monthly payments to Canadians aged 65 and over."),
    ("FIN", "BUV07"): ("Health care transfer to provinces", "The Canada Health Transfer, which helps provinces and territories pay for health care."),
    ("FIN", "BUV11"): ("Interest on the national debt", "Interest paid on money the federal government has borrowed."),
    ("FIN", "BUV08"): ("Equalization and social transfers to provinces", "Equalization, the Canada Social Transfer and territorial funding, which help provinces and territories pay for services."),
    ("CCRA", "BRB01"): ("Benefits paid by the Canada Revenue Agency", "Benefit payments the Canada Revenue Agency sends directly to people."),
    ("TBC", "BXC04"): ("Pensions and benefits for public servants", "The government's share, as employer, of federal workers' pensions, health and dental plans."),
    ("INAC", "BWM03"): ("Settling Indigenous land claims", "Payments to First Nations to settle specific claims about historic treaty and land obligations."),
}


def fiscal_year(year):
    """
    Purpose:
    	Turn the data's year into the label shown in the app.

    Args:
    	- year: the data's year, e.g. 2024 (April 2024 to March 2025)

    Returns:
    	str: the fiscal year label, e.g. "2024-25"
    """
    return f"{year}-{str(year + 1)[-2:]}"


def read_csv(name):
    """
    Purpose:
    	Read one of the GC InfoBase CSVs from pipeline/data/.

    Args:
    	- name: the file name, e.g. "programs.csv"

    Returns:
    	list[dict]: one dict per row, keyed by column name
    """
    with open(DATA / name, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def department_names():
    """
    Purpose:
    	Map each department code to its everyday name, using the latest year on record.

    Args:
    	(none)

    Returns:
    	dict[str, str]: dept_code to name, e.g. "ND" to "National Defence"
    """
    names = {}
    for row in sorted(read_csv("organizations.csv"), key=lambda r: int(r["year"] or 0)):
        if row["dept_code"]:
            names[row["dept_code"]] = row["applied_title_en"] or row["legal_title_en"]
    return names


def build(year):
    """
    Purpose:
    	Compute total federal spending for a year and split it into the biggest programs plus "All other programs".

    Args:
    	- year: the data's year, e.g. 2024

    Returns:
    	dict: the breakdown in the shape written to src/shared/breakdown.json
    """
    program_names = {
        (r["dept_code"], r["program_code"]): r["name_en"]
        for r in read_csv("programs.csv")
        if r["type"] == "program" and r["year"] == str(year)
    }
    departments = department_names()
    rows = [r for r in read_csv("programs_spending.csv") if r["year"] == str(year) and r["expenditure"]]
    if not rows:
        raise SystemExit(f"No spending rows for {year}")

    total = sum(float(r["expenditure"]) for r in rows)
    rows.sort(key=lambda r: float(r["expenditure"]), reverse=True)

    items = []
    for row in rows[:TOP_N]:
        key = (row["dept_code"], row["program_code"])
        if key not in PLAIN_NAMES:
            raise SystemExit(f"Write a plain name for {key} ({program_names.get(key)}) in PLAIN_NAMES first")
        name, description = PLAIN_NAMES[key]
        amount = float(row["expenditure"])
        items.append({
            "name": name,
            "description": description,
            "official_name": program_names.get(key, ""),
            "department": departments.get(row["dept_code"], row["dept_code"]),
            "dept_code": row["dept_code"],
            "program_code": row["program_code"],
            "amount": round(amount),
            "percent": round(amount / total * 100, 1),
        })

    other = total - sum(float(r["expenditure"]) for r in rows[:TOP_N])
    items.append({
        "name": "All other programs",
        "description": f"The other {len(rows) - TOP_N:,} federal programs, from defence to the public service.",
        "official_name": "",
        "department": "",
        "dept_code": "",
        "program_code": "",
        "amount": round(other),
        "percent": round(other / total * 100, 1),
    })

    return {
        "fiscal_year": fiscal_year(year),
        "total_federal_spending": round(total),
        "program_count": len(rows),
        "items": items,
        "source": SOURCE,
    }


def main():
    """
    Purpose:
    	Command-line entry point: build the breakdown and write it to src/shared/breakdown.json.

    Args:
    	(none; reads --year from the command line)

    Returns:
    	None
    """
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--year", type=int, default=2024)
    args = parser.parse_args()

    breakdown = build(args.year)
    OUT.write_text(json.dumps(breakdown, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"{breakdown['fiscal_year']}: total ${breakdown['total_federal_spending'] / 1e9:.1f}B across {breakdown['program_count']} programs")
    for item in breakdown["items"]:
        print(f"  {item['amount'] / 1e9:6.1f}B {item['percent']:5.1f}%  {item['name']}")
    print(f"Wrote {OUT.relative_to(HERE.parent)}")


if __name__ == "__main__":
    main()
