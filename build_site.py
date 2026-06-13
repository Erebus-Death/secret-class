#!/usr/bin/env python3
"""
Build script for Secret Class reader site – SMART version.
- Preserves existing chapters in chapters.json (never removes).
- Only adds new chapters found in local folder.
- Generates sitemap.xml and robots.txt.
"""

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

DEFAULT_CHAPTERS_DIR = Path.home() / "Desktop/secret-class-chapters"
DEFAULT_SITE_DIR     = Path.home() / "Desktop/secret-class-site"
DEFAULT_BASE_URL     = "https://readsecretclassonline.com"

SERIES_TITLE    = "Secret Class"
SERIES_AUTHOR   = "Wang Kang-cheol"
SERIES_ARTIST   = "Minachan"
SERIES_GENRES   = ["Romance", "Drama", "Mature", "School Life", "Slice of Life"]
SERIES_STATUS   = "Ongoing"
SERIES_SINOPSYS = (
    "After losing both parents at a young age, Daeho is taken in by his uncle's "
    "family. Growing up sheltered from the realities of adult life, he begins "
    "receiving an unusual education from the women around him — lessons that "
    "change everything."
)

CHAPTER_RE = re.compile(r"^ch(\d+(?:\.\d+)?)$")
IMG_RE     = re.compile(r"^(\d+)\.(jpg|jpeg|png|webp)$", re.IGNORECASE)


def natural_key(num: str):
    return tuple(int(p) if "." not in p else float(p) for p in num.split("."))


def discover_chapters(chapters_dir: Path):
    """Return list of dicts for chapters found locally."""
    out = []
    if not chapters_dir.exists():
        return out
    for folder in sorted(chapters_dir.iterdir()):
        if not folder.is_dir() or not CHAPTER_RE.match(folder.name):
            continue
        m = CHAPTER_RE.match(folder.name)
        num_str = m.group(1)
        pages = []
        for f in folder.iterdir():
            if f.is_file() and IMG_RE.match(f.name):
                pages.append(f.name)
        pages.sort(key=lambda n: int(IMG_RE.match(n).group(1)))
        if not pages:
            continue
        try:
            num = int(num_str) if "." not in num_str else float(num_str)
        except ValueError:
            num = num_str
        out.append({
            "num": num,
            "num_str": num_str,
            "folder": folder.name,
            "pages": pages,
        })
    out.sort(key=lambda c: natural_key(str(c["num"])))
    return out


def chapter_url(num_str: str) -> str:
    return f"/chapter/{num_str}/"


def build_chapters_json(existing_chapters, new_chapters):
    """Merge existing chapters (from old JSON) with newly discovered ones."""
    # Convert existing to dict keyed by num_str
    existing_dict = {c["num"]: c for c in existing_chapters}
    for new in new_chapters:
        num_str = new["num_str"]
        if num_str not in existing_dict:
            existing_dict[num_str] = {
                "num": num_str,
                "title": f"Chapter {num_str}",
                "pages": len(new["pages"]),
                "url": chapter_url(num_str),
                "folder": new["folder"],
                "images": [f"chapters/{new['folder']}/{p}" for p in new["pages"]],
            }
    # Convert back to list and sort numerically
    merged = list(existing_dict.values())
    merged.sort(key=lambda c: float(c["num"]) if c["num"].replace('.','').isdigit() else c["num"])
    return {
        "series": {
            "title": SERIES_TITLE,
            "author": SERIES_AUTHOR,
            "artist": SERIES_ARTIST,
            "status": SERIES_STATUS,
            "synopsis": SERIES_SINOPSYS,
            "genres": SERIES_GENRES,
            "totalChapters": len(merged),
        },
        "generated": dt.datetime.now().isoformat(timespec="seconds"),
        "chapters": merged,
    }


def render_sitemap(chapters, base_url):
    today = dt.date.today().isoformat()
    urls = [f"{base_url}/"] + [f"{base_url}{c['url']}" for c in chapters]
    body = "\n".join(
        f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{today}</lastmod>\n  </url>"
        for u in urls
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{body}
</urlset>
"""


def render_robots(base_url):
    return f"""User-agent: *
Allow: /
Sitemap: {base_url}/sitemap.xml
"""


def main():
    ap = argparse.ArgumentParser(description="Smart build for Secret Class reader.")
    ap.add_argument("--chapters-dir", type=Path, default=DEFAULT_CHAPTERS_DIR)
    ap.add_argument("--site-dir", type=Path, default=DEFAULT_SITE_DIR)
    ap.add_argument("--base-url", type=str, default=DEFAULT_BASE_URL)
    args = ap.parse_args()

    chapters_dir = args.chapters_dir.expanduser()
    site_dir = args.site_dir.expanduser()
    base_url = args.base_url.rstrip("/")

    print(f"   Chapters dir : {chapters_dir}")
    print(f"   Site dir     : {site_dir}")
    print(f"   Base URL     : {base_url}\n")

    # Load existing chapters.json if present
    existing_json_path = site_dir / "chapters.json"
    existing_chapters = []
    if existing_json_path.exists():
        try:
            with open(existing_json_path, "r") as f:
                data = json.load(f)
                existing_chapters = data.get("chapters", [])
                print(f"   Loaded {len(existing_chapters)} existing chapters from chapters.json")
        except Exception as e:
            print(f"   Warning: could not read existing chapters.json – {e}")

    # Discover new chapters from local folder
    new_chapters = discover_chapters(chapters_dir)
    print(f"   Found {len(new_chapters)} chapters in local folder")

    if not new_chapters and not existing_chapters:
        print("   ⚠️  No chapters found anywhere – aborting.")
        return 1

    # Merge and build final JSON
    final_json = build_chapters_json(existing_chapters, new_chapters)
    print(f"   Total chapters in output: {final_json['series']['totalChapters']}")

    # Write files
    site_dir.mkdir(parents=True, exist_ok=True)
    (site_dir / "chapters.json").write_text(json.dumps(final_json, indent=2))
    (site_dir / "sitemap.xml").write_text(render_sitemap(final_json["chapters"], base_url))
    (site_dir / "robots.txt").write_text(render_robots(base_url))

    print(f"\n   ✅ Build complete. {final_json['series']['totalChapters']} chapters.")
    return 0


if __name__ == "__main__":
    sys.exit(main())