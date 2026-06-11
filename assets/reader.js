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

  // Share widget
  const url = encodeURIComponent(window.location.origin + `/chapter/${chapter.num}/`);
  const text = encodeURIComponent(`Read ${series.title} Chapter ${dn}`);
  const shareEl = $('#share-widget');
  if (shareEl) {
    shareEl.innerHTML = `
      <h3>Enjoyed this chapter? Share it!</h3>
      <div class="share-buttons">
        <a href="https://twitter.com/intent/tweet?url=${url}&text=${text}" target="_blank" rel="noopener" class="share-btn twitter">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23.954 4.569c-.885.389-1.83.654-2.825.775 1.014-.611 1.794-1.574 2.163-2.723-.951.555-2.005.959-3.127 1.184-.896-.959-2.173-1.559-3.591-1.559-2.717 0-4.92 2.203-4.92 4.917 0 .39.045.765.127 1.124C7.691 8.094 4.066 6.13 1.64 3.161c-.427.722-.666 1.561-.666 2.475 0 1.71.87 3.213 2.188 4.096-.807-.026-1.566-.248-2.228-.616v.061c0 2.385 1.693 4.374 3.946 4.827-.413.111-.849.171-1.296.171-.314 0-.615-.03-.916-.086.631 1.953 2.445 3.377 4.604 3.417-1.68 1.319-3.809 2.105-6.102 2.105-.39 0-.779-.023-1.17-.067 2.189 1.394 4.768 2.209 7.557 2.209 9.054 0 13.999-7.496 13.999-13.986 0-.209 0-.42-.015-.63.961-.689 1.8-1.56 2.46-2.548l-.047-.02z"/></svg> Twitter
        </a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noopener" class="share-btn facebook">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M22.676 0H1.324C.593 0 0 .593 0 1.324v21.352C0 23.408.593 24 1.324 24h11.494v-9.294H9.689v-3.621h3.129V8.41c0-3.099 1.894-4.785 4.659-4.785 1.325 0 2.464.097 2.796.141v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.314h3.587l-.467 3.621h-3.12V24h6.116c.73 0 1.324-.592 1.324-1.324V1.324C24 .593 23.408 0 22.676 0z"/></svg> Facebook
        </a>
        <a href="https://www.reddit.com/submit?url=${url}&title=${text}" target="_blank" rel="noopener" class="share-btn reddit">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.561-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg> Reddit
        </a>
      </div>
    `;
  }

  // SEO block
  $('#chapter-seo').innerHTML = `
    <h2>Read ${escapeHtml(series.title)} Chapter ${dn} English</h2>
    <div class="seo-content">
      <p>You are reading <strong>${escapeHtml(series.title)} Chapter ${dn}</strong> in high quality. ${escapeHtml(series.synopsis)}</p>
      <p class="seo-disclaimer">All chapters are presented for fan reading purposes. All rights belong to ${escapeHtml(series.author)} and ${escapeHtml(series.artist)}.</p>
    </div>
    <div class="seo-tags">
       ${series.genres.map(g => `<span class="pv-tag">${escapeHtml(g)}</span>`).join('')}
    </div>
  `;

  // Latest widget
  const latest = allChapters.filter(c => c.num !== chapter.num).slice(-12).reverse();
  $('#latest-list').innerHTML = latest.map(c =>
    `<li><a href="/chapter/${c.num}/"><span class="ch-prefix">Ch.</span><span class="ch-num">${displayNum(c.num)}</span></a></li>`
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