#!/usr/bin/env python3
"""
Build script for the Secret Class reader site (v2 — dynamic reader).

Reads chapter folders from:
    ~/Desktop/secret-class-chapters/ch###/001.jpg, 002.jpg, ...

And produces, under the site root (~/Desktop/secret-class-site/):
    chapters.json   ← single source of truth: every chapter + its page list
    sitemap.xml     ← pretty URLs: /chapter/001/, /chapter/002/, ...
    chapters/       ← hard-linked image mirror (so the site is self-contained)

The site uses ONE reader template (reader.html) that reads chapters.json
and renders any chapter dynamically. No more generating 309 HTML files.

Usage
-----
    python3 build_site.py                       # builds with the defaults
    python3 build_site.py --site-dir <path>     # override site output dir
    python3 build_site.py --chapters-dir <path> # override scraped-chapters dir
    python3 build_site.py --base-url https://secretclass.example.com
"""

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

# ----------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------
DEFAULT_CHAPTERS_DIR = Path.home() / "Desktop/secret-class-chapters"
DEFAULT_SITE_DIR     = Path.home() / "Desktop/secret-class-site"
DEFAULT_BASE_URL     = "https://secretclass.example.com"  # change to your real domain

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


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def natural_key(num: str):
    """Sort key so 1, 2, 10 sort correctly; '12.5' sorts between 12 and 13."""
    return tuple(int(p) if "." not in p else float(p)
                 for p in num.split("."))


def discover_chapters(chapters_dir: Path):
    """Return list of dicts: {num, num_str, folder, pages} sorted ascending."""
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
            "num":     num,
            "num_str": num_str,
            "folder":  folder.name,
            "pages":   pages,
        })
    out.sort(key=lambda c: natural_key(str(c["num"])))
    return out


def chapter_url(num_str: str) -> str:
    """Pretty URL: /chapter/001/"""
    return f"/chapter/{num_str}/"


def chapter_api_path(num_str: str) -> str:
    """Internal reference path: chapters/ch001/001.jpg"""
    folder = f"ch{int(float(num_str)):03d}" if "." in num_str else f"ch{int(num_str):03d}"
    return folder


# ----------------------------------------------------------------------
# Mirror images into the site
# ----------------------------------------------------------------------
def mirror_chapters(chapters, site_dir: Path):
    """Hard-link images from the scrape dir into <site>/chapters/."""
    target_root = site_dir / "chapters"
    for c in chapters:
        src_dir = None
        # Resolve source folder from chapters_dir (parent of build script's context)
        for candidate in [Path.home() / "Desktop/secret-class-chapters" / c["folder"]]:
            if candidate.exists():
                src_dir = candidate
                break
        if src_dir is None:
            continue

        dst_dir = target_root / c["folder"]
        dst_dir.mkdir(parents=True, exist_ok=True)
        for page_name in c["pages"]:
            src = src_dir / page_name
            dst = dst_dir / page_name
            if not dst.exists() and src.exists():
                try:
                    dst.hardlink_to(src)
                except (OSError, NotImplementedError):
                    dst.write_bytes(src.read_bytes())


# ----------------------------------------------------------------------
# chapters.json — the single source of truth
# ----------------------------------------------------------------------
def build_chapters_json(chapters) -> dict:
    """Return the full manifest that the reader will fetch."""
    items = []
    for c in chapters:
        items.append({
            "num":     c["num_str"],
            "title":   f"Chapter {c['num_str']}",
            "pages":   len(c["pages"]),
            "url":     chapter_url(c["num_str"]),
            "folder":  c["folder"],
            "images":  [f"chapters/{c['folder']}/{p}" for p in c["pages"]],
        })
    return {
        "series": {
            "title":       SERIES_TITLE,
            "author":      SERIES_AUTHOR,
            "artist":      SERIES_ARTIST,
            "status":      SERIES_STATUS,
            "synopsis":    SERIES_SINOPSYS,
            "genres":      SERIES_GENRES,
            "totalChapters": len(items),
        },
        "generated": dt.datetime.now().isoformat(timespec="seconds"),
        "chapters":  items,
    }


# ----------------------------------------------------------------------
# Sitemap
# ----------------------------------------------------------------------
def render_sitemap(chapters, base_url: str) -> str:
    today = dt.date.today().isoformat()
    urls = [f"{base_url}/"]
    urls += [f"{base_url}{chapter_url(c['num_str'])}" for c in chapters]
    body = "\n".join(
        f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{today}</lastmod>\n  </url>"
        for u in urls
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{body}
</urlset>
"""


# ----------------------------------------------------------------------
# robots.txt
# ----------------------------------------------------------------------
def render_robots(base_url: str) -> str:
    return f"""User-agent: *
Allow: /
Sitemap: {base_url}/sitemap.xml
"""


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Build the Secret Class reader site (v2).")
    ap.add_argument("--chapters-dir", type=Path, default=DEFAULT_CHAPTERS_DIR)
    ap.add_argument("--site-dir",     type=Path, default=DEFAULT_SITE_DIR)
    ap.add_argument("--base-url",     type=str,  default=DEFAULT_BASE_URL)
    args = ap.parse_args()

    chapters_dir = args.chapters_dir.expanduser()
    site_dir     = args.site_dir.expanduser()
    base_url     = args.base_url.rstrip("/")

    print(f"   Chapters dir : {chapters_dir}")
    print(f"   Site dir     : {site_dir}")
    print(f"   Base URL     : {base_url}\n")

    chapters = discover_chapters(chapters_dir)
    if not chapters:
        print(f"   ⚠️  No chapters found in {chapters_dir}")
        return 1
    print(f"   Found {len(chapters)} chapter(s).")

    site_dir.mkdir(parents=True, exist_ok=True)

    # 1. Mirror chapter images into <site>/chapters/
    print("   Mirroring chapter images into site…")
    mirror_chapters(chapters, site_dir)

    # 2. chapters.json
    print("   Writing chapters.json…")
    (site_dir / "chapters.json").write_text(
        json.dumps(build_chapters_json(chapters), ensure_ascii=False, indent=2)
    )

    # 3. sitemap.xml
    print("   Writing sitemap.xml…")
    (site_dir / "sitemap.xml").write_text(render_sitemap(chapters, base_url))

    # 4. robots.txt
    print("   Writing robots.txt…")
    (site_dir / "robots.txt").write_text(render_robots(base_url))

    print(f"\n   ✅ Build complete. {len(chapters)} chapters available.")
    print(f"      Open index.html directly, or run:  python3 serve.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
