"""Pull federal spending news from Google News RSS and save the raw articles (Task 2, Phase 1).

Writes pipeline/news_raw.json. Each run adds new articles and keeps old ones (deduped by Google's
article id), so articles that drop out of the RSS feed are not lost. Phase 2 (Gemini extraction) reads this file.

Usage:
  python3 pipeline/fetch_news.py            # fetch all queries, update news_raw.json
  python3 pipeline/fetch_news.py --days 7   # only articles from the last 7 days (default 30)
"""

import argparse
import html
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "news_raw.json"

QUERIES = [
    '"federal government" spent million Canada',
    '"federal government" contract million Canada',
    'Ottawa federal contract awarded million',
    '"Government of Canada" invests million',
    '"Department of National Defence" contract Canada',
    '"Public Services and Procurement Canada" contract',
    'federal funding announced million Canada',
]


def rss_url(query, days):
    q = urllib.parse.quote(f"{query} when:{days}d")
    return f"https://news.google.com/rss/search?q={q}&hl=en-CA&gl=CA&ceid=CA:en"


def clean(text):
    """Strip HTML tags and entities from the RSS description."""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", text or ""))).strip()


def fetch(query, days):
    req = urllib.request.Request(rss_url(query, days), headers={"User-Agent": "Mozilla/5.0 (Tally news pipeline)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        root = ET.fromstring(r.read())
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for item in root.iter("item"):
        source = item.find("source")
        title = item.findtext("title", "")
        outlet = source.text if source is not None else ""
        # Google appends " - Outlet" to every title; drop it so headlines are clean.
        if outlet and title.endswith(f" - {outlet}"):
            title = title[: -len(f" - {outlet}")]
        pub = item.findtext("pubDate")
        yield {
            "id": item.findtext("guid", ""),
            "title": title,
            "link": item.findtext("link", ""),
            "outlet": outlet,
            "outlet_url": source.get("url", "") if source is not None else "",
            "published": parsedate_to_datetime(pub).date().isoformat() if pub else None,
            "snippet": clean(item.findtext("description", "")),
            "query": query,
            "fetched_at": now,
        }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=30)
    args = ap.parse_args()

    articles = json.loads(OUT.read_text()) if OUT.exists() else []
    seen = {a["id"] for a in articles}
    before = len(articles)

    for q in QUERIES:
        got = new = 0
        for a in fetch(q, args.days):
            got += 1
            if a["id"] and a["id"] not in seen:
                seen.add(a["id"])
                articles.append(a)
                new += 1
        print(f"{got:4d} found, {new:4d} new  | {q}")

    articles.sort(key=lambda a: a["published"] or "", reverse=True)
    OUT.write_text(json.dumps(articles, indent=2, ensure_ascii=False) + "\n")
    print(f"\n{len(articles) - before} new articles, {len(articles)} total -> {OUT.relative_to(HERE.parent)}")


if __name__ == "__main__":
    main()
