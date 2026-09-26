"""Find federal programs with the biggest spending jumps/drops between two fiscal years.

Reads GC InfoBase CSVs from pipeline/data/ and writes pipeline/candidates.csv for
a quick manual approve/reject pass (see implementation.md, Phase 1).

Usage: python3 pipeline/find_jumps.py [--from 2022] [--to 2024] [--min 50e6] [--top 40] [--include-restructured]
"""

import argparse
from pathlib import Path

import pandas as pd

HERE = Path(__file__).parent
DATA = HERE / "data"


def fy(year):
    """2024 -> '2024-25' (the data's year = April of that year to March of the next)."""
    return f"{year}-{str(year + 1)[-2:]}"


def load(year_from, year_to):
    spending = pd.read_csv(DATA / "programs_spending.csv")
    programs = pd.read_csv(DATA / "programs.csv")
    orgs = pd.read_csv(DATA / "organizations.csv", usecols=["year", "dept_code", "legal_title_en", "applied_title_en"])

    programs = programs[programs["type"] == "program"][["year", "dept_code", "program_code", "name_en"]]
    df = spending.merge(programs, on=["year", "dept_code", "program_code"], how="left")

    # Latest known department name per dept_code (applied title is the everyday name).
    orgs["dept_name"] = orgs["applied_title_en"].fillna(orgs["legal_title_en"])
    orgs = orgs.dropna(subset=["dept_code"]).sort_values("year").drop_duplicates("dept_code", keep="last")
    df = df.merge(orgs[["dept_code", "dept_name"]], on="dept_code", how="left")

    years = [year_from, year_from + 1, year_to] if year_to - year_from == 2 else [year_from, year_to]
    return df[df["year"].isin(years)], years


def build(df, years, min_amount):
    year_from, year_to = years[0], years[-1]
    wide = df.pivot_table(index=["dept_code", "program_code"], columns="year", values="expenditure", aggfunc="sum")
    names = df.sort_values("year").groupby(["dept_code", "program_code"]).agg(
        name_old=("name_en", "first"), name=("name_en", "last"), department=("dept_name", "last")
    )
    out = wide.join(names).reset_index()
    for y in years:
        out[y] = out[y] if y in out else float("nan")

    out["old"] = out[year_from]
    out["new"] = out[year_to]

    # Flags for jumps that are probably accounting changes, not real spending changes.
    flags = []
    for _, r in out.iterrows():
        f = []
        if pd.isna(r["old"]) or r["old"] == 0:
            f.append("NEW (no row in earlier year: likely restructure)")
        if pd.isna(r["new"]) or r["new"] == 0:
            f.append("GONE (no row in later year: likely restructure)")
        if isinstance(r["name_old"], str) and isinstance(r["name"], str) and r["name_old"] != r["name"]:
            f.append("RENAMED")
        if len(years) == 3 and pd.notna(r[years[1]]) and pd.notna(r["old"]) and pd.notna(r["new"]):
            mid, lo, hi = r[years[1]], min(r["old"], r["new"]), max(r["old"], r["new"])
            if mid > hi * 1.5 or mid < lo * 0.5:
                f.append("ONE-OFF? (middle year is way off)")
        flags.append("; ".join(f))
    out["flags"] = flags

    out["old"] = out["old"].fillna(0)
    out["new"] = out["new"].fillna(0)
    out["change"] = out["new"] - out["old"]
    out["ratio"] = out.apply(lambda r: r["new"] / r["old"] if r["old"] > 0 else float("inf"), axis=1)

    is_internal = out["name"].fillna("").str.contains("Internal Services", case=False)
    is_small = (out["old"] < min_amount) & (out["new"] < min_amount)
    # A "jump" must be big in % too: grew 1.5x+ or shrank to 2/3 or less. Steady growth isn't news.
    is_steady = out["ratio"].between(0.67, 1.5) | (out["old"] < 0) | (out["new"] < 0)
    return out[~is_internal & ~is_small & ~is_steady]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="year_from", type=int, default=2022)
    ap.add_argument("--to", dest="year_to", type=int, default=2024)
    ap.add_argument("--min", dest="min_amount", type=float, default=50e6)
    ap.add_argument("--top", type=int, default=40)
    ap.add_argument("--include-restructured", action="store_true", help="keep NEW/GONE rows")
    args = ap.parse_args()

    df, years = load(args.year_from, args.year_to)
    out = build(df, years, args.min_amount)

    # NEW/GONE rows are almost always program codes being renumbered, not real changes.
    if not args.include_restructured:
        out = out[~out["flags"].str.contains("NEW|GONE")]

    # Rank by size of the dollar change (jumps and drops both count).
    out = out.reindex(out["change"].abs().sort_values(ascending=False).index).head(args.top)

    total_to = df[df["year"] == args.year_to]["expenditure"].sum()
    b = lambda v: round(v / 1e9, 3)
    result = pd.DataFrame({
        "keep": "",
        "department": out["department"],
        "dept_code": out["dept_code"],
        "program_code": out["program_code"],
        "program": out["name"],
        f"{fy(years[0])}_B": out["old"].map(b),
        **({f"{fy(years[1])}_B": out[years[1]].fillna(0).map(b)} if len(years) == 3 else {}),
        f"{fy(years[-1])}_B": out["new"].map(b),
        "change_B": out["change"].map(b),
        "times": out["ratio"].map(lambda x: "" if x == float("inf") else round(x, 2)),
        "flags": out["flags"],
    })
    path = HERE / "candidates.csv"
    result.to_csv(path, index=False)
    print(f"Total federal spending {fy(args.year_to)}: ${total_to / 1e9:.1f}B")
    print(f"Wrote {len(result)} candidates to {path} ({(result['flags'] != '').sum()} flagged)")


if __name__ == "__main__":
    main()
