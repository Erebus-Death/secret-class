/* =================================================================
   landing.js — runs on index.html only.
   Fetches chapters.json, renders the static chapter list (real <a>
   tags with pretty URLs), wires up CTAs and the "Continue Reading"
   pill from localStorage.
================================================================= */

(async function () {
  'use strict';

  const grid = document.getElementById('chapter-grid');
  const search = document.getElementById('search-box');
  const chaptersCount = document.getElementById('chapters-count');
  const btnLatest = document.getElementById('btn-latest');
  const btnChapter1 = document.getElementById('btn-chapter-1');
  const btnContinue = document.getElementById('btn-continue');
  const lastReadWrap = document.getElementById('last-update-wrap');
  const lastReadLink = document.getElementById('last-read-link');

  let manifest = null;
  try {
    const r = await fetch('chapters.json', { cache: 'no-cache' });
    manifest = await r.json();
  } catch (e) {
    if (grid) {
      grid.innerHTML =
        `<p style="color:#888;">Could not load chapters.json. ` +
        `Make sure you're running this site through a web server ` +
        `(e.g. <code>python3 serve.py</code>) — opening index.html directly via ` +
        `file:// will fail because browsers block fetch() on local files.</p>`;
    }
    return;
  }

  const { series, chapters } = manifest;
  if (chaptersCount) chaptersCount.textContent = `${chapters.length}+`;

  // ── Render chapter list (newest first) ─────────────────────
  const newest = chapters[chapters.length - 1];
  if (newest && btnLatest) btnLatest.href = `/reader.html?chapter=${newest.num}`;

  if (grid) {
    const newestNum = newest ? newest.num : null;
    const items = chapters.slice().reverse().map((c) => {
      const isNew = c.num === newestNum;
      return `<a class="chapter-item" href="/reader.html?chapter=${c.num}" ` +
             `data-num="${c.num}" ` +
             `title="Read ${escapeHtml(series.title)} Chapter ${c.num} (${c.pages} pages)">` +
             `<span class="chapter-num">Ch.${c.num}</span>` +
             `<span class="chapter-name">Chapter ${c.num}</span>` +
             (isNew ? '<span class="new-badge">New</span>' : '') +
             `<span class="chapter-date">${c.pages} pages</span>` +
             `</a>`;
    });
    grid.innerHTML = items.join('');
  }

  // ── Search filter (progressive enhancement) ────────────────
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase().trim();
      grid.querySelectorAll('.chapter-item').forEach((item) => {
        const text = item.textContent.toLowerCase();
        item.style.display = (!q || text.includes(q)) ? '' : 'none';
      });
    });
  }

  // ── "Continue Reading" pill (from localStorage) ────────────
  try {
    const last = localStorage.getItem('sc:lastChapter');
    if (last && btnContinue) {
      // Make sure the chapter actually exists
      const exists = chapters.some((c) => c.num === last);
      if (exists) {
        btnContinue.href = `/reader.html?chapter=${last}`;
        btnContinue.style.display = '';
        if (lastReadWrap && lastReadLink) {
          lastReadLink.textContent = `Chapter ${last}`;
          lastReadLink.href = `/reader.html?chapter=${last}`;
          lastReadWrap.style.display = '';
        }
      }
    }
  } catch (e) { /* private mode */ }
})();

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
