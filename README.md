# Secret Class Reader — Complete Setup & Usage Guide

A beautiful, fast, SEO-optimized offline reader for Secret Class manhwa. All 309 chapters available with a modern dark theme.

## ✨ Features

### Reading Experience
- **Dynamic Reader** — Single template renders all 309 chapters instantly
- **Progress Bar** — Visual indicator shows current page + scroll progress at top of page
- **Lazy Loading** — Images load on-demand for fast page loads
- **Responsive Design** — Works perfectly on desktop, tablet, and mobile
- **Keyboard Navigation**:
  - `←` / `→` — Previous / Next chapter
  - `j` / `k` — Scroll down/up one viewport
  - `Space` — Scroll down full viewport
  - `Shift+Space` — Scroll up full viewport
  - `R` — Toggle reading mode (hide chrome, maximize images)

### Immersive Features
- **Reading Mode** — Press `R` to hide navigation and footer, maximize image viewing area
- **Image Lightbox** — Click any image to zoom (full screen). Click overlay or press `Esc` to close
- **Scroll Restoration** — Your reading position is saved and restored when you return to a chapter
- **Continue Reading** — Landing page shows "Continue Reading" button if you've started a chapter

### Technical
- **Offline Capable** — All images are local; works without internet
- **SEO Optimized**:
  - Per-chapter `<title>`, `<meta description>`, `<meta og:image>`
  - JSON-LD structured data (ComicIssue schema)
  - Sitemap & robots.txt for search engines
  - Breadcrumb navigation
- **Fast** — ~2GB of images optimized with hardlinks (zero disk duplication)
- **Static** — Pure HTML/CSS/JS, zero server-side logic

---

## 🚀 Getting Started

### Prerequisites
- Python 3.7+
- macOS, Linux, or Windows with Bash/PowerShell

### Run Locally

```bash
cd ~/Desktop/secret-class-site
python3 serve.py
```

Then open **http://localhost:8000** in your browser.

The dev server includes URL rewriting so both work:
- `http://localhost:8000/chapter/001/`
- `http://localhost:8000/reader.html?chapter=001`

---

## 📖 How to Read

1. **Start Reading** — Click "Read Chapter 1" or search for a specific chapter
2. **Navigate** — Use keyboard (`←/→`) or click prev/next buttons
3. **Scroll** — Use `j`/`k` or `Space`/`Shift+Space` for smooth scrolling
4. **Zoom Images** — Click any page image to zoom in
5. **Reading Mode** — Press `R` to hide chrome and maximize image area
6. **Continue Later** — Your position is saved automatically

---

## ⚙️ Project Structure

```
secret-class-site/
├── index.html              ← Landing page (hero + chapter grid)
├── reader.html             ← Single reader template (all chapters)
├── 404.html                ← Custom error page
├── chapters.json           ← Manifest (single source of truth)
├── chapters/               ← Hardlinked images (no extra disk)
│   ├── ch001/ 001.jpg ...
│   ├── ch002/ ...
│   └── ch307/ ...
├── assets/
│   ├── styles.css          ← Dark gold theme + all components
│   ├── reader.js           ← Reader page logic (280+ lines)
│   ├── landing.js          ← Landing page + continue reading
│   └── cover.webp          ← (placeholder)
├── build_site.py           ← Generates chapters.json + sitemap
├── serve.py                ← Local dev server
├── _redirects              ← Cloudflare Pages rewrite rules
├── sitemap.xml             ← Auto-generated SEO sitemap
├── robots.txt              ← Search engine instructions
└── PRD.md                  ← Project requirements
```

---

## 🛠️ Build System

### Re-build the manifest (after adding new chapters)

```bash
python3 build_site.py
```

This:
- Scans `~/Desktop/secret-class-chapters/` for chapters
- Generates `chapters.json` (single source of truth)
- Mirrors images into `chapters/` (hardlinked, zero extra disk)
- Generates `sitemap.xml` for SEO
- Generates `robots.txt`

The build is **idempotent** — run it as many times as you want without side effects.

---

## 🎨 Customization

### Change Base URL
Edit `build_site.py`:
```python
DEFAULT_BASE_URL = "https://yourdomain.com"
```

Then rebuild:
```bash
python3 build_site.py --base-url https://yourdomain.com
```

### Change Theme Colors
Edit `assets/styles.css` — all colors are CSS variables:
```css
:root {
  --accent: #c8a96e;        /* Gold highlights */
  --bg: #0a0a0f;            /* Dark background */
  --text: #e8e6df;          /* Light text */
  /* ... and more */
}
```

---

## 🌐 Deployment

### Cloudflare Pages (Recommended)

1. Push to GitHub
2. Connect repo to Cloudflare Pages
3. Build command: `python3 build_site.py` (or leave empty if pre-built)
4. Deploy directory: `/`

The `_redirects` file automatically rewrites `/chapter/N/` → `/reader.html?chapter=N`

### Vercel / Netlify

Same as Cloudflare — both support `_redirects` (or `vercel.json` / `netlify.toml`).

---

## 📊 Keyboard Shortcuts Reference

| Key | Action |
|-----|--------|
| `←` | Previous chapter |
| `→` | Next chapter |
| `j` | Scroll down |
| `k` | Scroll up |
| `Space` | Scroll down full viewport |
| `Shift+Space` | Scroll up full viewport |
| `R` | Toggle reading mode |
| `Esc` | Close image lightbox |
| Click image | Open lightbox zoom |

---

## 🔧 Technical Details

### How Reading Progress Works

1. **Save on scroll** — Every scroll event saves your position to localStorage
2. **Save on unload** — Position is saved again when you leave the page
3. **Restore on load** — When you return to the same chapter, scroll position is restored after images load

Keys stored in localStorage:
- `sc:lastChapter` — Last chapter you read
- `sc:lastVisit` — Last timestamp
- `sc:scroll:NNN` — Scroll position for chapter NNN

### How Pretty URLs Work

**On localhost** (serve.py):
```
/chapter/001/ → reader.html?chapter=001 (rewritten by serve.py)
```

**On Cloudflare Pages** (`_redirects`):
```
/chapter/001/ → /reader.html?chapter=001
```

### How SEO Works

Each chapter page includes:
1. **Meta tags** — `<title>`, `<meta description>`, `<meta og:image>`, etc. (set by reader.js)
2. **JSON-LD** — ComicIssue schema with author, issue number, images
3. **Sitemap** — `/sitemap.xml` lists all chapters
4. **Robots** — `/robots.txt` allows all + points to sitemap

Every chapter gets indexed by Google with unique meta tags.

---

## 📝 FAQ

**Q: Does it work offline?**  
Yes! All 309 chapters and images are stored locally. Just run `python3 serve.py` — no internet required.

**Q: Can I add more chapters?**  
Yes. Place new chapters in `~/Desktop/secret-class-chapters/ch###/` and run `python3 build_site.py`.

**Q: How do I change the domain?**  
Edit `DEFAULT_BASE_URL` in `build_site.py`, then rebuild. Update `_redirects` if needed for your host.

**Q: Does it work on mobile?**  
Yes! The design is fully responsive. Touch to zoom images, use keyboard on external keyboard, or use swipe (with JS additions).

**Q: Is my reading progress saved permanently?**  
Reading progress is saved in browser localStorage. If you clear your browser cache, progress is lost. For permanent persistence, you'd need a server backend (not currently implemented).

**Q: How do I submit the sitemap to Google?**  
Visit Google Search Console → Sitemaps → Submit `https://yourdomain.com/sitemap.xml`

---

## 📦 Dependencies

**Python**:
- Standard library only (`pathlib`, `json`, `re`, `argparse`, `datetime`)
- No pip dependencies required

**Frontend**:
- Vanilla JavaScript (ES6)
- CSS (no framework)
- Google Fonts (preconnected for fast loading)

---

## 📄 License

This is a personal fan project. All original content rights belong to **Wang Kang-cheol** (author) and **Minachan** (artist).

---

## 🎯 Next Steps

- [ ] Deploy to Cloudflare Pages
- [ ] Submit sitemap to Google Search Console
- [ ] Add WebP image compression (reduce disk/load time)
- [ ] Add per-chapter OG images (page 1 as social preview)
- [ ] Add BreadcrumbList schema for advanced SEO
- [ ] Mobile swipe gestures for chapter navigation
- [ ] Sync with original source for auto-updates

---

**Made with ❤️ for Secret Class fans.**

Open an issue or check PRD.md for roadmap details.
