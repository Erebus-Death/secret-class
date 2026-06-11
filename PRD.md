# Secret Class Reader Site — Project Requirements Document

**Status:** Draft v1.0
**Date:** 2026-06-11
**Author:** You + Mavis
**Location:** `~/Desktop/secret-class-site/`

---

## 1. What We Have Right Now

### Scraped data
| Metric | Value |
|---|---|
| Total chapter folders | 309 (`ch001` – `ch307` + `ch129.5`, `ch129.6`) |
| Disk usage | ~2.0 GB (source: `~/Desktop/secret-class-chapters/`) |
| Downloaded images | Hard-linked into `site/chapters/` (0 extra disk) |
| `download_complete.txt` markers | 309/309 |

### Current site (v2 — dynamic reader)
| File | What it does |
|---|---|
| `assets/styles.css` | Shared CSS (dark gold theme, Bebas Neue + DM Sans fonts) |
| `assets/reader.js` | Reader-page script — fetches `chapters.json`, renders the chapter, sets per-page meta, keyboard nav |
| `assets/landing.js` | Landing-page script — fetches `chapters.json`, renders the chapter list, wires "Continue Reading" |
| `build_site.py` | Generates `chapters.json`, `sitemap.xml`, `robots.txt` + hard-links images |
| `serve.py` | Local web server with pretty-URL rewrite (`/chapter/001/` → `reader.html?chapter=001`) |
| `index.html` | Landing page |
| `reader.html` | **Single** reader template — renders any chapter dynamically |
| `chapters.json` | Manifest of all chapters (single source of truth) |
| `chapters/` | Mirror of scraped images (hardlinked, no extra disk) |
| `sitemap.xml` | Pretty URLs for Google |
| `robots.txt` | Allow all + sitemap pointer |
| `_redirects` | Cloudflare Pages rewrite rule (same as serve.py) |
| `PRD.md` | This document |

**⚠️ Known issues found during audit:**
- Some chapters have 1–3 tiny placeholder images (1–4 KB, 720×439 grayscale) — likely toongod serving a "no image" stub when the real image 404'd. Chapters affected: ch027, ch028, ch041, ch042, ch049, ch050, ch058, ch061, ch064, ch081, ch138, ch142, ch149, ch152–154, ch172, ch179, ch201, ch202 + likely more.
- Cover image is still a CSS placeholder — no real cover art.

---

## 2. Project Vision

**A fast, beautiful, SEO-optimized static reader for Secret Class manhwa — the best personal reading experience, with or without an internet connection.**

This is a personal project (self-hosted). The goal is not to compete with commercial aggregators but to build something you genuinely enjoy using, learn from, and can point to as a solid piece of work.

---

## 3. Goals

### Must Have (MVP)
1. Every chapter viewable in a browser as a proper page-turn reader
2. Landing page lists all chapters with a working search filter
3. Every chapter has its own URL — crawlable and indexable
4. Per-chapter SEO meta tags (unique title, description, JSON-LD)
5. Prev/Next chapter navigation inside each chapter page
6. "Latest Chapters" widget on each chapter page (internal linking)
7. Site builds in one command from the scraped data
8. Works offline (all images local) when served from the Desktop

### Should Have (Quality)
9. Reading experience: vertical scroll reader with page numbers, reading progress
10. "Continue where you left off" — localStorage saves your last chapter + page
11. Keyboard navigation: `←`/`→` for chapters, `j`/`k` for pages
12. Image lazy loading + responsive sizing
13. Real cover image in the hero section
14. 404 page
15. All placeholder images (1–4 KB stubs) re-downloaded from source

### Nice to Have (Polish)
16. Dark/light theme toggle
17. Image zoom on click (lightbox)
18. Reading mode: hide chrome, maximize image area
19. Per-chapter OG image (page 1 as social preview)
20. Deployment to a free static host (Cloudflare Pages / Vercel / Netlify)
21. Custom domain + HTTPS
22. Image compression → WebP (reduce disk/load time)
23. Search Console submission + sitemap pinging
24. Schema.org `BreadcrumbList` structured data

---

## 4. Site Structure (v2 — dynamic reader)

```
secret-class-site/
├── index.html                ← Landing: hero + chapter list + about
├── reader.html              ← ONE template, renders any chapter dynamically
├── chapters.json            ← Manifest (single source of truth)
├── chapters/                ← Hardlinked image mirror (no extra disk)
│   ├── ch001/ 001.jpg ...
│   ├── ...
│   └── ch129.6/ ...
├── assets/
│   ├── styles.css           ← Shared design system
│   ├── reader.js            ← Reader-page script
│   ├── landing.js           ← Landing-page script
│   └── cover.webp           ← (to be sourced)
├── build_site.py            ← Generates chapters.json + sitemap + robots
├── serve.py                 ← Local server with /chapter/N/ → reader.html?chapter=N rewrite
├── _redirects               ← Cloudflare Pages rewrite rule
├── sitemap.xml              ← Auto-generated (pretty URLs)
├── robots.txt               ← Auto-generated
├── PRD.md                   ← This document
└── README.md                ← (future) how to run, how to deploy
```

**Why dynamic over per-chapter HTML files:**
- 309 chapter pages → 1 reader template + 1 JSON file
- Adding a new chapter = re-run `build_site.py` once. No regenerating 309 HTMLs.
- Image source-of-truth stays in one place (hardlinks, not copies)
- Per-page meta tags are still set (in `reader.js`) so SEO is identical

**Pretty URL flow:**
```
Browser → /chapter/001/
   ↓
serve.py (or Cloudflare _redirects) rewrites
   ↓
/reader.html?chapter=001
   ↓
reader.js reads ?chapter=001, fetches chapters.json, renders
```

---

## 5. Chapter Page Template (rendered by `reader.html` + `reader.js`)

```
┌─────────────────────────────────────────────┐
│ NAV: [Secret Class]  Home  Chapters  About │
├─────────────────────────────────────────────┤
│ Home › Secret Class › Chapter N             │  ← Breadcrumbs
├─────────────────────────────────────────────┤
│                                             │
│     Secret Class Chapter N                   │  ← h1
│     18 pages · June 2026 release           │
│                                             │
│  [← Chapter N-1] [All Chapters] [Next →]   │  ← Prev/Next nav
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  [001.jpg — page 1]                 │   │  ← Server-rendered <img>
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  [002.jpg — page 2]                 │   │
│  └─────────────────────────────────────┘   │
│         ... (all pages, lazy-loaded)        │
│                                             │
│  [← Chapter N-1] [All Chapters] [Next →]   │
│                                             │
│  Read Secret Class Chapter N                 │  ← SEO text block
│  Continue reading Secret Class with Chapter N │
│  Tags: Romance, Drama, Mature, School Life   │
│                                             │
│  Latest Chapters                            │  ← Widget (12 links)
│  [Ch.307] [Ch.306] ... [Ch.296]           │
│                                             │
├─────────────────────────────────────────────┤
│ © 2026 Secret Class Fan Reader             │
└─────────────────────────────────────────────┘
```

**Per-page meta (all unique):**
- `<title>`: "Read Secret Class Chapter N – Read Manhwa Online"
- `<meta description>`: "Read Secret Class Chapter N in high quality. X pages, fast loading. By Wang Kang-cheol, illustrated by Minachan."
- `<link rel="canonical">`: unique per page
- `<meta property="og:image">`: page 1 image
- JSON-LD `ComicIssue` schema with `issueNumber`, `name`, `image`, `url`, `author`, `artist`

---

## 6. Reader Behavior

| Interaction | Behavior |
|---|---|
| Click chapter from landing | Navigate to `/chapter/N/` |
| `←` arrow | Go to older chapter (`/chapter/(N-1)/`) |
| `→` arrow | Go to newer chapter (`/chapter/(N+1)/`) |
| `j` | Scroll down one viewport |
| `k` | Scroll up one viewport |
| Reload page | Resume at same scroll position (browser default) |
| Open site | "Continue Reading" button appears if you have a saved chapter in localStorage |

---

## 7. Build Workflow

```
1. Run scraper  → images land in ~/Desktop/secret-class-chapters/ch###/
2. (optional) Run fix script → re-download any 1–4 KB placeholder images
3. Run build:   python3 build_site.py
                 → chapters.json + sitemap.xml + robots.txt + image mirror
4. Serve locally:  python3 serve.py
                 → open http://localhost:8000
5. Deploy:      push to GitHub → Cloudflare Pages auto-deploys
                 → /chapter/N/ rewritten by _redirects
```

The build script is **idempotent** — run it as many times as you want.

---

## 8. Technical Stack

| Layer | Choice | Why |
|---|---|---|
| Pages | Static HTML | Fast, no server, SEO-friendly, works offline |
| Styling | Plain CSS (CSS custom properties) | No framework needed for 1 site |
| JS | Vanilla JS (ES6) | Reader only; no React/Vue needed |
| Images | Local JPG (hard-linked from source) | 0 extra disk vs copies; swap to WebP later |
| Build | Python 3 (stdlib + BeautifulSoup + requests) | Simple, portable, no build step |
| Hosting | Cloudflare Pages (target) | Free, global CDN, zero config |
| Domain | TBD (your choice) | |
| CI/CD | GitHub Actions (future) | Push → auto-deploy |

---

## 9. Open Questions (for you to decide)

1. **Hosting:** Do you want this live on the internet? If so: what's your domain plan — buy one or use a free subdomain?
2. **Cover image:** Do you have a real cover image, or should I source one?
3. **Reader UX:** The current plan is a vertical-scroll reader. Do you want a page-by-page click-through reader instead (like Tapas / Webtoon)?
4. **Ongoing updates:** Once the site is live, do you want to keep it updated automatically (re-scrape + rebuild on a schedule)?

---

## 10. TODO

### Phase 1 — Site foundation (this session)
- [ ] Re-run `build_site.py` against all 309 chapters
- [ ] Fix/re-download the ~20+ chapters with tiny placeholder images
- [ ] Add real cover image to hero
- [ ] Add 404 page
- [ ] Rebuild

### Phase 2 — Reader polish (next session)
- [ ] Vertical scroll reader with progress indicator
- [ ] Keyboard navigation (← → j k)
- [ ] "Continue where you left off" (localStorage)
- [ ] Reading mode (hide nav/footer)
- [ ] Lightbox zoom on image click

### Phase 3 — SEO + discoverability (after hosting)
- [ ] Submit sitemap to Google Search Console
- [ ] Per-chapter OG images
- [ ] `BreadcrumbList` schema
- [ ] Compress images to WebP
- [ ] Deploy pipeline (GitHub → Cloudflare Pages)
