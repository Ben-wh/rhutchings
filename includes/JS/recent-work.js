/*
Fills the "Recent Work" section on the home page with the 3 most recent shows
from portfolio/shows. Uses the same order as the portfolio board: newest "year"
first, then the order in shows.json. Hidden shows are skipped.
If anything fails, the links already in index.html are left as they are.
*/
(() => {
  'use strict';

  const SHOWS_DIR = 'portfolio/shows/';
  const COUNT = 3;
  const container = document.querySelector('.recent-work-container');
  if (!container) return;

  const present = (v) => v != null && String(v).trim() !== '';
  const isAbsolute = (p) => /^([a-z][a-z\d+.-]*:|\/)/i.test(p);
  const asset = (slug, p) => (isAbsolute(p) ? p : `${SHOWS_DIR}${encodeURIComponent(slug)}/${p}`);

  async function getJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return res.json();
  }

  function tile(show) {
    const a = document.createElement('a');
    a.className = 'recent-work';
    a.href = `portfolio/show.html?show=${encodeURIComponent(show.slug)}`;

    const title = document.createElement('p');
    title.className = 'jost recent-work-title';
    title.textContent = show.title;

    const img = document.createElement('img');
    img.className = 'recent-work-img';
    img.src = present(show.poster) ? asset(show.slug, show.poster) : 'includes/images/work-images/placeholder.png';
    img.alt = show.posterAlt || show.title;
    img.addEventListener('error', () => { img.src = 'includes/images/work-images/placeholder.png'; }, { once: true });

    a.append(title, img);
    return a;
  }

  (async () => {
    try {
      const manifest = await getJSON(`${SHOWS_DIR}shows.json`);
      const slugs = (Array.isArray(manifest) ? manifest : manifest.shows || []).map(String);

      const shows = await Promise.all(slugs.map((slug, order) =>
        getJSON(`${SHOWS_DIR}${encodeURIComponent(slug)}/show.json`)
          .then((data) => ({ ...data, slug, order }))
          .catch(() => null)
      ));

      const recent = shows
        .filter((s) => s && present(s.title) && !s.hidden)
        .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || a.order - b.order)
        .slice(0, COUNT);

      if (recent.length) container.replaceChildren(...recent.map(tile));
    } catch (err) {
      console.warn('[recent-work] Keeping the default list:', err.message);
    }
  })();
})();
