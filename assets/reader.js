/* =================================================================
   Secret Class — reader.js  (PanelVerse-accurate layout)
   ================================================================= */

const $ = (sel) => document.querySelector(sel);

function getChapterFromURL() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('chapter');
  if (q) return q;
  const m = window.location.pathname.match(/\/chapter\/(\d+(?:\.\d+)?)\/?$/);
  return m ? m[1] : null;
}

function getSavedScroll(num) {
  try { return parseInt(localStorage.getItem(`sc:scroll:${num}`), 10) || 0; }
  catch (e) { return 0; }
}

(async function () {
  let manifest;
  const isPretty = window.location.pathname.match(/\/chapter\/\d+(?:\.\d+)?\/?$/);
  const basePath = isPretty ? '../../' : './';
  try {
    const res = await fetch(basePath + 'chapters.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (err) {
    document.body.innerHTML = `<div style="padding:4rem;text-align:center;color:#888;">Failed to load chapters.json</div>`;
    return;
  }

  const { series, chapters } = manifest;
  const byNum = new Map(chapters.map(c => [c.num, c]));

  const readerEl = $('#reader-pages');
  if (!readerEl) return;

  const numStr = getChapterFromURL();
  if (!numStr) {
    readerEl.innerHTML = `<p style="padding:4rem;text-align:center;">No chapter specified. <a href="../">Go home</a></p>`;
    return;
  }

  const chapter = byNum.get(numStr);
  if (!chapter) {
    readerEl.innerHTML = `<p style="padding:4rem;text-align:center;">Chapter ${numStr} not found. <a href="../">Browse chapters</a></p>`;
    return;
  }

  try {
    localStorage.setItem('sc:lastChapter', chapter.num);
    localStorage.setItem('sc:lastVisit', Date.now());
  } catch (e) {}

  renderChapter(chapter, chapters, series);
  setupDropdowns(chapter, chapters);
  setupKeyboardNav(chapter, chapters);
  setupProgressBar();
  setupReadingMode();
  setupScrollTracking(chapter);
  attachPageNav();
  setupBackToTop();

  window.addEventListener('load', () => {
    const saved = getSavedScroll(chapter.num);
    if (saved > 0) requestAnimationFrame(() => window.scrollTo(0, saved));
  });
})();

function setupBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > window.innerHeight) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ─────────────────────────────────────────────────────────────────
function renderChapter(chapter, allChapters, series) {
  const idx = allChapters.findIndex(c => c.num === chapter.num);
  const older = idx > 0 ? allChapters[idx - 1] : null;
  const newer = idx < allChapters.length - 1 ? allChapters[idx + 1] : null;
  const dn = displayNum(chapter.num);

  // Meta
  const title = `${series.title} Chapter ${dn} – Secret Class Reader`;
  const desc = `Read ${series.title} Chapter ${dn} online free. ${chapter.pages} pages. By ${series.author}, art by ${series.artist}.`;
  document.title = title;
  setMeta('description', desc);
  setMeta('og:title', title, 'property');
  setMeta('og:description', desc, 'property');
  if (chapter.images?.[0]) setMeta('og:image', chapter.images[0], 'property');
  setLinkRel('canonical', `/chapter/${chapter.num}/`);

  // JSON-LD
  $('#jsonld').textContent = JSON.stringify({
    "@context": "https://schema.org", "@type": "ComicIssue",
    "issueNumber": chapter.num,
    "name": `${series.title} Chapter ${chapter.num}`,
    "isPartOf": { "@type": "ComicSeries", "name": series.title, "url": "/" },
    "image": chapter.images?.slice(0, 3),
    "author": series.author, "artist": series.artist
  });

  // H1
  $('#pv-title').textContent = `${series.title} Chapter ${dn}`;

  // Breadcrumbs
  $('#pv-bc-series').textContent = series.title;
  $('#pv-bc-chapter').textContent = `Chapter ${dn}`;

  // Description
  $('#pv-description').innerHTML =
    `${escapeHtml(series.synopsis || '')} — <strong>Chapter ${dn}</strong>, ${chapter.pages} pages.`;

  // Tags
  $('#pv-tags').innerHTML =
    `<span class="pv-tag pv-tag-status">${series.status}</span>` +
    series.genres.map(g => `<span class="pv-tag">${escapeHtml(g)}</span>`).join('');

  // Author credit — separate element inside the card, below tags
  let authorEl = document.getElementById('pv-author');
  if (!authorEl) {
    authorEl = document.createElement('p');
    authorEl.id = 'pv-author';
    authorEl.className = 'pv-author-line';
    $('#pv-info-card')?.appendChild(authorEl);
  }
  authorEl.textContent = `✎ ${series.author} / ${series.artist}`;

  // Prev/Next buttons
  setNavPill('pv-prev-top', older);
  setNavPill('pv-prev-bot', older);
  setNavPill('pv-next-top', newer);
  setNavPill('pv-next-bot', newer);

  // Dropdown labels
  const label = `Chapter ${dn}`;
  ['pv-dropdown-label-top', 'pv-dropdown-label-bot'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = label;
  });

  // Chapter list html (newest first)
  const listHtml = allChapters.slice().reverse().map(c => {
    const isCurrent = c.num === chapter.num;
    const cdn = displayNum(c.num);
    return `<li class="${isCurrent ? 'pv-current' : ''}">` +
      (isCurrent
        ? `<span>Chapter ${cdn}</span>`
        : `<a href="/chapter/${c.num}/">Chapter ${cdn}</a>`) +
      `</li>`;
  }).join('');
  ['pv-chapter-list-top', 'pv-chapter-list-bot'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = listHtml;
  });

  const isPretty = window.location.pathname.match(/\/chapter\/\d+(?:\.\d+)?\/?$/);
  const basePath = isPretty ? '../../' : './';

  // Reader images
  $('#reader-pages').innerHTML = chapter.images.map((src, i) =>
    `<img src="${basePath}${src}" alt="${escapeHtml(series.title)} Chapter ${dn} Page ${i + 1}" loading="lazy" />`
  ).join('');

  // SEO block
  $('#chapter-seo').innerHTML = `
    <h2>Read ${escapeHtml(series.title)} Chapter ${dn}</h2>
    <p>All chapters are presented for fan reading purposes; all rights belong to ${escapeHtml(series.author)} and ${escapeHtml(series.artist)}.</p>
    <p>Tags: ${series.genres.map(escapeHtml).join(', ')}</p>
  `;

  // Latest widget
  const latest = allChapters.filter(c => c.num !== chapter.num).slice(-12).reverse();
  $('#latest-list').innerHTML = latest.map(c =>
    `<li><a href="/chapter/${c.num}/">Ch.${displayNum(c.num)}</a></li>`
  ).join('');
}

// ─────────────────────────────────────────────────────────────────
function setNavPill(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const isPrev = id.includes('prev');
  el.textContent = isPrev ? '‹ Prev' : 'Next ›';
  if (!target) {
    el.removeAttribute('href');
    el.classList.add('pv-pill-disabled');
  } else {
    el.href = `/chapter/${target.num}/`;
    el.classList.remove('pv-pill-disabled');
  }
}

// ─── Dropdown open/close ──────────────────────────────────────────
function setupDropdowns(chapter, allChapters) {
  [
    ['pv-dropdown-btn-top', 'pv-dropdown-panel-top', 'pv-chapter-list-top'],
    ['pv-dropdown-btn-bot', 'pv-dropdown-panel-bot', 'pv-chapter-list-bot'],
  ].forEach(([btnId, panelId, listId]) => {
    const btn = document.getElementById(btnId);
    const panel = document.getElementById(panelId);
    if (!btn || !panel) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !panel.hidden;
      closeAllDropdowns();
      if (!isOpen) {
        panel.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        // Scroll current chapter into view
        const list = document.getElementById(listId);
        const current = list?.querySelector('.pv-current');
        if (current) requestAnimationFrame(() => current.scrollIntoView({ block: 'center' }));
      }
    });
  });

  // Click outside closes
  document.addEventListener('click', closeAllDropdowns);

  // Navigate on list item click (already handled by <a> links,
  // but close the panel on any click inside it)
  ['pv-dropdown-panel-top', 'pv-dropdown-panel-bot'].forEach(id => {
    const panel = document.getElementById(id);
    panel?.addEventListener('click', (e) => {
      // Let the <a> navigate; close the dropdown
      setTimeout(closeAllDropdowns, 0);
    });
  });
}

function closeAllDropdowns() {
  ['pv-dropdown-panel-top', 'pv-dropdown-panel-bot'].forEach(id => {
    const panel = document.getElementById(id);
    if (panel) panel.hidden = true;
  });
  ['pv-dropdown-btn-top', 'pv-dropdown-btn-bot'].forEach(id => {
    document.getElementById(id)?.setAttribute('aria-expanded', 'false');
  });
}

// ─────────────────────────────────────────────────────────────────
function setupKeyboardNav(currentChapter, allChapters) {
  const idx = allChapters.findIndex(c => c.num === currentChapter.num);
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'Escape') { closeAllDropdowns(); return; }
    if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      window.location.href = `/chapter/${allChapters[idx - 1].num}/`;
    } else if (e.key === 'ArrowRight' && idx < allChapters.length - 1) {
      e.preventDefault();
      window.location.href = `/chapter/${allChapters[idx + 1].num}/`;
    }
  });
}

function setupProgressBar() {
  let bar = document.getElementById('progress-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'progress-bar';
    bar.className = 'reader-progress-bar';
    document.body.insertBefore(bar, document.body.firstChild);
  }
  const updateBar = () => {
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (docH > 0 ? (window.scrollY / docH) * 100 : 0) + '%';
    updateProgressText();
  };
  window.addEventListener('scroll', updateBar, { passive: true });
  updateBar();
}

function updateProgressText() {
  let text = document.getElementById('progress-text');
  if (!text) {
    text = document.createElement('li');
    text.id = 'progress-text';
    text.className = 'reader-progress-text';
    document.querySelector('ul.nav-links')?.appendChild(text);
  }
  const images = document.querySelectorAll('#reader-pages img');
  if (!images.length) return;
  let current = 1;
  const mid = window.innerHeight / 2;
  for (let i = 0; i < images.length; i++) {
    const r = images[i].getBoundingClientRect();
    if (r.top <= mid && r.bottom >= mid) { current = i + 1; break; }
  }
  text.textContent = `${current} / ${images.length}`;
}

function setupReadingMode() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key?.toLowerCase() === 'r') {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      document.body.classList.toggle('reading-mode');
    }
  });
}

function setupScrollTracking(chapter) {
  let t;
  const save = () => { try { localStorage.setItem(`sc:scroll:${chapter.num}`, window.scrollY); } catch (e) {} };
  window.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(save, 200); }, { passive: true });
  window.addEventListener('beforeunload', save);
}

function attachPageNav() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'j') window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
    else if (e.key === 'k') window.scrollBy({ top: -window.innerHeight * 0.85, behavior: 'smooth' });
    else if (e.key === ' ' && !e.shiftKey) { e.preventDefault(); window.scrollBy({ top: window.innerHeight, behavior: 'smooth' }); }
    else if (e.key === ' ' && e.shiftKey) { e.preventDefault(); window.scrollBy({ top: -window.innerHeight, behavior: 'smooth' }); }
  });
}

function setMeta(name, content, attr = 'name') {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}
function setLinkRel(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
  el.setAttribute('href', href);
}
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Display chapter number without leading zeros: "001" → "1", "129.5" → "129.5"
function displayNum(num) {
  const n = parseFloat(num);
  return Number.isInteger(n) ? String(n) : String(num).replace(/^0+/, '');
}