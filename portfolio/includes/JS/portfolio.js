/*
What u peeking at huh ? ;)
Site made by Ben Whitrow - benwhitrow.co.uk
©Remee Hutchings, All Rights Reserved.

Renders the board (index.html) and every show page (show.html?show=<slug>)
from the JSON files in /shows. You shouldn't need to edit this to add a show —
see README.md.
*/
(() => {
  'use strict';

  const SHOWS_DIR = 'shows/';
  const MANIFEST = `${SHOWS_DIR}shows.json`;
  const SITE_NAME = 'Remée Hutchings';

  /* ------------------------------------------------------------------
     Page chrome: fade-in, navbar, footer year
  ------------------------------------------------------------------ */
  const showPage = () => document.body.classList.add('loaded');
  window.addEventListener('load', showPage);
  setTimeout(showPage, 4000);

  const nav = document.querySelector('.navbar');
  const onScroll = () => nav && nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (burger && navLinks) {
    const setOpen = (open) => {
      burger.classList.toggle('open', open);
      navLinks.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    };
    burger.addEventListener('click', () => setOpen(!navLinks.classList.contains('open')));
    navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
     Helpers
  ------------------------------------------------------------------ */

  // el('a', { class: 'x', href: '/' }, 'text', childNode, [more, children])
  // Text is always inserted as text, never as HTML.
  function el(tag, props = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    // Only real nodes and non-empty strings: skips null/false/0 from `cond && el(...)`
    for (const kid of kids.flat(Infinity)) {
      if (kid instanceof Node || (typeof kid === 'string' && kid !== '')) node.append(kid);
    }
    return node;
  }

  const icon = (name) => el('i', { class: `bi ${name}`, 'aria-hidden': 'true' });
  const present = (v) => v != null && String(v).trim() !== '';
  const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]).filter((x) => x != null && x !== '');
  const paragraphs = (v) =>
    (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/\n\s*\n/) : [])
      .map((p) => String(p).trim())
      .filter(Boolean);

  const isAbsolute = (p) => /^([a-z][a-z\d+.-]*:|\/)/i.test(p);
  // Paths in show.json are relative to that show's folder unless they start with / or http(s)://
  const asset = (slug, p) => (!present(p) ? '' : isAbsolute(p) ? p : `${SHOWS_DIR}${encodeURIComponent(slug)}/${p}`);
  const safeHref = (u) => (/^\s*(javascript|data|vbscript):/i.test(u) ? null : u);

  const showUrl = (slug) => `show.html?show=${encodeURIComponent(slug)}`;

  const initials = (title) =>
    String(title)
      .split(/\s+/)
      .filter((w) => /^[\p{L}\d]/u.test(w) && !/^(the|of|and|a|an)$/i.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '★';

  async function getJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return res.json();
  }

  function loadErrorMessage() {
    return location.protocol === 'file:'
      ? 'The shows can’t load when the page is opened straight from a file. Run a local server in this folder (e.g. "npx serve" or "python3 -m http.server") and open it from there.'
      : 'Couldn’t load the shows right now. Please refresh the page.';
  }

  /* ------------------------------------------------------------------
     Data
  ------------------------------------------------------------------ */

  async function fetchShow(slug, order = 0) {
    const data = await getJSON(`${SHOWS_DIR}${encodeURIComponent(slug)}/show.json`);
    return { ...data, slug, order };
  }

  // Every show listed in shows/shows.json, newest year first.
  // Shows from the same year (or with no year) keep the order they have in shows.json.
  async function loadShows() {
    const manifest = await getJSON(MANIFEST);
    const slugs = (Array.isArray(manifest) ? manifest : manifest.shows || []).map(String);

    const shows = await Promise.all(
      slugs.map((slug, i) =>
        fetchShow(slug, i).catch((err) => {
          console.warn(`[portfolio] Skipping "${slug}": ${err.message}`);
          return null;
        })
      )
    );

    return shows
      .filter((s) => s && present(s.title) && !s.hidden)
      .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || a.order - b.order);
  }

  // Poster with a monogram fallback if there's no image (or it fails to load)
  function posterMedia(show, cls, { lazy = true, decorative = false } = {}) {
    const wrap = el('div', { class: cls });
    const fallback = () =>
      el('span', { class: 'poster-fallback montecarlo-regular', 'aria-hidden': 'true', text: initials(show.title) });

    const src = asset(show.slug, show.poster);
    if (!src) {
      wrap.classList.add('no-image');
      wrap.append(fallback());
      return wrap;
    }

    const img = el('img', {
      src,
      alt: decorative ? '' : show.posterAlt || `${show.title} poster`,
      loading: lazy ? 'lazy' : null,
      decoding: 'async',
    });
    img.addEventListener('error', () => {
      console.warn(`[portfolio] Image not found: ${src}`);
      wrap.classList.add('no-image');
      img.replaceWith(fallback());
    }, { once: true });
    wrap.append(img);
    return wrap;
  }

  /* ------------------------------------------------------------------
     Board page
  ------------------------------------------------------------------ */

  function card(show) {
    const media = posterMedia(show, 'show-card-media', { decorative: true });
    if (present(show.category)) media.append(el('span', { class: 'show-card-tag', text: show.category }));

    const meta = [show.year, show.role].filter(present).join(' · ');

    return el('a', { class: 'show-card', href: showUrl(show.slug) },
      media,
      el('div', { class: 'show-card-body' },
        meta && el('p', { class: 'show-card-meta', text: meta }),
        el('h3', { class: 'show-card-title jost', text: show.title }),
        present(show.summary) && el('p', { class: 'show-card-summary jost', text: show.summary }),
        el('span', { class: 'show-card-cta cinzel' }, 'View show', icon('bi-arrow-right'))
      )
    );
  }

  function skeletonCard() {
    return el('div', { class: 'show-card is-skeleton', 'aria-hidden': 'true' },
      el('div', { class: 'show-card-media' }),
      el('div', { class: 'show-card-body' },
        el('span', { class: 'sk-line short' }),
        el('span', { class: 'sk-line' })
      )
    );
  }

  async function initBoard(grid) {
    const filtersEl = document.getElementById('board-filters');
    const status = document.getElementById('board-status');

    grid.setAttribute('aria-busy', 'true');
    grid.replaceChildren(...Array.from({ length: 6 }, skeletonCard));

    let shows;
    try {
      shows = await loadShows();
    } catch (err) {
      console.error(err);
      grid.replaceChildren();
      status.textContent = loadErrorMessage();
      return;
    } finally {
      grid.removeAttribute('aria-busy');
    }

    if (!shows.length) {
      grid.replaceChildren();
      status.textContent = 'No shows yet. Check back soon.';
      return;
    }

    const cards = shows.map(card);
    cards.forEach((c, i) => { c.style.animationDelay = `${Math.min(i, 12) * 60}ms`; });
    grid.replaceChildren(...cards);

    // Filter chips, built from whatever categories the shows use
    const categories = [...new Set(shows.map((s) => s.category).filter(present))];
    if (categories.length < 2 || !filtersEl) return;

    const ALL = 'All';
    const requested = new URLSearchParams(location.search).get('category');
    const chips = [ALL, ...categories].map((c) =>
      el('button', { type: 'button', class: 'filter-chip', 'data-category': c, 'aria-pressed': 'false', text: c })
    );

    const apply = (category) => {
      chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.category === category)));
      cards.forEach((c, i) => { c.hidden = category !== ALL && shows[i].category !== category; });

      const url = new URL(location.href);
      if (category === ALL) url.searchParams.delete('category');
      else url.searchParams.set('category', category);
      history.replaceState(null, '', url);
    };

    chips.forEach((chip) => chip.addEventListener('click', () => apply(chip.dataset.category)));
    filtersEl.replaceChildren(...chips);
    filtersEl.hidden = false;
    apply(categories.includes(requested) ? requested : ALL);
  }

  /* ------------------------------------------------------------------
     Show page
  ------------------------------------------------------------------ */

  function section(title, ...content) {
    return el('section', { class: 'show-section' },
      el('h2', { class: 'cinzel show-section-title', text: title }),
      ...content
    );
  }

  function prose(text) {
    const paras = paragraphs(text);
    if (!paras.length) return null;
    return el('div', { class: 'show-prose' },
      el('span', { class: 'vertical-span', 'aria-hidden': 'true' }),
      el('div', {}, paras.map((p) => el('p', { class: 'jost', text: p })))
    );
  }

  // YouTube / Vimeo links become embeds; .mp4/.webm files play directly
  function videoBlock(show) {
    const raw = show.video;
    if (!present(raw)) return null;

    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(raw)) {
      return el('div', { class: 'show-media' },
        el('video', { src: asset(show.slug, raw), controls: true, preload: 'metadata', playsinline: true }));
    }

    let src = '';
    try {
      const url = new URL(raw, location.href);
      const host = url.hostname.replace(/^(www|m)\./, '');
      if (host === 'youtu.be') {
        src = `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
      } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        const id = url.searchParams.get('v') || (url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/) || [])[1];
        if (id) src = `https://www.youtube-nocookie.com/embed/${id}`;
      } else if (host === 'vimeo.com') {
        const id = (url.pathname.match(/^\/(\d+)/) || [])[1];
        if (id) src = `https://player.vimeo.com/video/${id}`;
      } else if (/^https?:$/.test(url.protocol)) {
        src = url.href;
      }
    } catch { /* bad URL: skip the video */ }

    if (!src) return null;
    return el('div', { class: 'show-media' },
      el('iframe', {
        src,
        title: `${show.title} video`,
        loading: 'lazy',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        referrerpolicy: 'strict-origin-when-cross-origin',
        allowfullscreen: true,
      })
    );
  }

  function factsPanel(show) {
    const facts = [
      ['Role', show.role],
      ['Venue', show.venue],
      ['Dates', show.dates || show.year],
      ['Company', show.company],
      ['Type', show.category],
      ...list(show.facts).map((f) => [f.label, f.value]),
    ].filter(([label, value]) => present(label) && present(value));

    const kit = list(show.kit);
    const links = list(show.links).filter((l) => l && present(l.url) && safeHref(l.url));

    if (!facts.length && !kit.length && !links.length) return null;

    const blocks = [];
    if (facts.length) {
      blocks.push(el('dl', { class: 'facts-list' },
        facts.map(([label, value]) => el('div', { class: 'fact' },
          el('dt', { text: label }),
          el('dd', { class: 'jost', text: String(value) })))
      ));
    }
    if (kit.length) {
      blocks.push(el('div', {},
        el('p', { class: 'facts-heading', text: show.kitTitle || 'Kit' }),
        el('ul', { class: 'kit-list jost' }, kit.map((k) => el('li', { text: k })))
      ));
    }
    if (links.length) {
      blocks.push(el('div', {},
        el('p', { class: 'facts-heading', text: 'Links' }),
        el('ul', { class: 'facts-links jost' }, links.map((l) => {
          const href = asset(show.slug, l.url);
          return el('li', {}, el('a', { href, target: '_blank', rel: 'noopener' }, l.label || l.url, icon('bi-arrow-up-right')));
        }))
      ));
    }

    const withDividers = blocks.flatMap((b, i) => (i ? [el('div', { class: 'facts-divider', 'aria-hidden': 'true' }), b] : [b]));
    return el('aside', { class: 'show-facts', 'aria-label': 'Show details' }, withDividers);
  }

  function lightbox(items, title) {
    const img = el('img', { alt: '' });
    const caption = el('figcaption', { class: 'jost lightbox-caption' });
    const count = el('span', { class: 'lightbox-count cinzel', 'aria-live': 'polite' });
    const multi = items.length > 1;
    let index = 0;

    const go = (n) => {
      index = (n + items.length) % items.length;
      const item = items[index];
      img.src = item.src;
      img.alt = item.alt || item.caption || `${title}, photo ${index + 1}`;
      caption.textContent = item.caption || '';
      caption.hidden = !item.caption;
      count.textContent = `${index + 1} / ${items.length}`;
    };

    const dialog = el('dialog', { class: 'lightbox', 'aria-label': `${title} photos` },
      el('figure', { class: 'lightbox-figure' }, img, caption),
      el('button', { type: 'button', class: 'lightbox-btn lightbox-close', 'aria-label': 'Close', onclick: () => dialog.close() }, icon('bi-x-lg')),
      multi && el('button', { type: 'button', class: 'lightbox-btn lightbox-prev', 'aria-label': 'Previous photo', onclick: () => go(index - 1) }, icon('bi-chevron-left')),
      multi && el('button', { type: 'button', class: 'lightbox-btn lightbox-next', 'aria-label': 'Next photo', onclick: () => go(index + 1) }, icon('bi-chevron-right')),
      multi && count
    );

    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', (e) => {
      if (!multi) return;
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    });
    let touchX = null;
    dialog.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    dialog.addEventListener('touchend', (e) => {
      if (touchX == null || !multi) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
      touchX = null;
    });
    dialog.addEventListener('close', () => { document.documentElement.style.overflow = ''; });

    document.body.append(dialog);
    return (n) => {
      go(n);
      document.documentElement.style.overflow = 'hidden';
      dialog.showModal();
    };
  }

  function gallerySection(show) {
    const items = list(show.gallery)
      .map((g) => (typeof g === 'string' ? { src: g } : g))
      .filter((g) => g && present(g.src))
      .map((g) => ({ ...g, src: asset(show.slug, g.src) }));
    if (!items.length) return null;

    const open = lightbox(items, show.title);
    return el('section', { class: 'show-wide' },
      el('h2', { class: 'cinzel show-section-title', text: show.galleryTitle || 'Gallery' }),
      el('div', { class: 'gallery-grid' }, items.map((item, i) =>
        el('button', {
          type: 'button',
          class: 'gallery-item',
          'aria-label': `Open photo ${i + 1}${item.caption ? `: ${item.caption}` : ''}`,
          onclick: () => open(i),
        }, el('img', { src: item.src, alt: '', loading: 'lazy', decoding: 'async' }))
      ))
    );
  }

  function creditsSection(show) {
    const credits = list(show.credits).filter((c) => c && (present(c.name) || present(c.role)));
    if (!credits.length) return null;
    return el('section', { class: 'show-wide' },
      el('h2', { class: 'cinzel show-section-title', text: show.creditsTitle || 'Credits' }),
      el('dl', { class: 'credits-grid' }, credits.map((c) =>
        el('div', { class: 'credit' },
          el('dt', { text: c.role || '' }),
          el('dd', { class: 'jost', text: c.name || '' })))
      )
    );
  }

  function pager(prev, next) {
    const link = (show, dir) => show
      ? el('a', { class: `pager-link ${dir}`, href: showUrl(show.slug) },
          el('span', { class: 'pager-label', text: dir === 'prev' ? '← Previous' : 'Next →' }),
          el('span', { class: 'pager-title jost', text: show.title }))
      : el('span', { 'aria-hidden': 'true' });

    return el('nav', { class: 'show-wide show-pager', 'aria-label': 'More shows' },
      link(prev, 'prev'),
      el('div', { class: 'all-work-btn-wrap' },
        el('a', { class: 'cinzel all-work-btn', href: './#board' }, 'All Shows', icon('bi-grid-3x3-gap'))),
      link(next, 'next')
    );
  }

  // "All shows" goes back in history when we came from the board, so the
  // filter and scroll position are kept; otherwise it's a normal link.
  function backLink() {
    const a = el('a', { class: 'back-link cinzel', href: './#board' }, icon('bi-arrow-left'), 'All shows');
    a.addEventListener('click', (e) => {
      try {
        const ref = new URL(document.referrer);
        const board = new URL('./', location.href);
        if (ref.origin === location.origin && (ref.pathname === board.pathname || ref.pathname === `${board.pathname}index.html`)) {
          e.preventDefault();
          history.back();
        }
      } catch { /* no referrer: follow the link */ }
    });
    return a;
  }

  function renderShow(root, show, prev, next) {
    document.title = `${show.title} · ${SITE_NAME}`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && present(show.summary)) metaDesc.setAttribute('content', show.summary);

    // Hero
    const eyebrow = [show.year, show.category].filter(present).join(' · ');
    const hero = el('header', { class: 'show-hero' },
      backLink(),
      el('div', { class: 'show-hero-text' },
        eyebrow && el('p', { class: 'show-hero-eyebrow', text: eyebrow }),
        el('h1', { class: 'cinzel show-title', text: show.title }),
        present(show.role) && el('p', { class: 'jost show-hero-role', text: show.role }),
        present(show.summary) && el('p', { class: 'jost show-hero-summary', text: show.summary })
      ),
      posterMedia(show, 'show-hero-poster', { lazy: false })
    );
    const heroSrc = asset(show.slug, show.heroImage || show.poster);
    if (heroSrc) hero.style.setProperty('--hero-img', `url(${JSON.stringify(heroSrc)})`);

    // Main column
    const sections = [];
    const about = prose(show.about);
    if (about) sections.push(section(show.aboutTitle || 'The Show', about));

    const responsibilities = list(show.responsibilities);
    if (responsibilities.length || present(show.roleIntro)) {
      sections.push(section(show.responsibilitiesTitle || 'My Role',
        present(show.roleIntro) && el('p', { class: 'jost show-text', text: show.roleIntro }),
        responsibilities.length && el('ul', { class: 'show-list jost' }, responsibilities.map((r) => el('li', { text: r })))
      ));
    }

    // Any extra sections: [{ "title": "...", "text": "..." }] or { "title", "points": [...] }
    list(show.sections).forEach((s) => {
      if (!s || !present(s.title)) return;
      const points = list(s.points);
      sections.push(section(s.title,
        prose(s.text),
        points.length && el('ul', { class: 'show-list jost' }, points.map((p) => el('li', { text: p })))
      ));
    });

    const video = videoBlock(show);
    if (video) sections.push(section(show.videoTitle || 'Watch', video));

    const facts = factsPanel(show);
    if (!sections.length) {
      sections.push(el('section', { class: 'show-section' },
        el('p', { class: 'jost show-text', text: 'More details about this show are coming soon.' })));
    }

    const body = el('main', { class: 'show-body' },
      el('div', { class: `show-layout${facts ? '' : ' show-layout--single'}` },
        el('div', { class: 'show-main' }, sections),
        facts
      ),
      gallerySection(show),
      creditsSection(show),
      pager(prev, next)
    );

    root.replaceChildren(hero, body);
  }

  function renderMissing(root, message) {
    document.title = `Show not found · ${SITE_NAME}`;
    root.replaceChildren(el('main', { class: 'show-missing' },
      el('h1', { class: 'cinzel section-title', text: message ? 'Something went wrong' : 'Show not found' }),
      el('p', { class: 'jost section-subtitle', text: message || 'That show doesn’t exist, or it’s been moved.' }),
      el('div', { class: 'all-work-btn-wrap' },
        el('a', { class: 'cinzel all-work-btn', href: './#board' }, 'All Shows', icon('bi-arrow-right')))
    ));
  }

  async function initShow(root) {
    const slug = new URLSearchParams(location.search).get('show');
    if (!slug || !/^[\w-]+$/.test(slug)) return renderMissing(root);

    let shows = [];
    let listError = null;
    try { shows = await loadShows(); } catch (err) { listError = err; console.error(err); }

    const index = shows.findIndex((s) => s.slug === slug);
    let show = shows[index];

    // Not on the board (hidden, or not in shows.json yet)? Still viewable by its link.
    if (!show) {
      try { show = await fetchShow(slug); } catch (err) {
        console.warn(`[portfolio] ${err.message}`);
        if (listError) return renderMissing(root, loadErrorMessage());
      }
    }
    if (!show || !present(show.title)) return renderMissing(root);

    renderShow(root, show, index > 0 ? shows[index - 1] : null, index >= 0 ? shows[index + 1] : null);
  }

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  const grid = document.getElementById('board-grid');
  if (grid) initBoard(grid);

  const showRoot = document.getElementById('show-root');
  if (showRoot) initShow(showRoot);
})();
