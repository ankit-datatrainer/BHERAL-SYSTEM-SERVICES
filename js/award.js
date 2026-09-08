/**
 * BHERAL SYSTEMS & SERVICES — "AWARD" MOTION ENGINE
 * Paired with css/award.css. Zero dependencies.
 *
 * Everything here is additive and selector-driven, so every page in the site
 * animates without page-specific markup. Order of operations:
 *   1. mount the preloader as early as possible (defer runs pre-DOMContentLoaded paint)
 *   2. build ambient chrome (grain, progress rail, cursor)
 *   3. tag the DOM with reveal/stagger attributes
 *   4. observe, animate, and re-tag when scripts inject new cards
 */
(() => {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const raf = window.requestAnimationFrame.bind(window);

  /* ======================================================================
     1. PRELOADER
     ====================================================================== */
  const STATUS_LINES = [
    'Booting re-commerce lab',
    'Loading certified inventory',
    'Syncing repair bench',
    'Calibrating valuations',
    'Ready'
  ];

  function mountPreloader() {
    const el = document.createElement('div');
    el.className = 'aw-preloader';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', 'Loading Bheral Systems');
    el.innerHTML = `
      <div class="aw-preloader__aurora"></div>
      <div class="aw-preloader__inner">
        <div class="aw-preloader__mark"><span>BHERAL</span><span>SYSTEMS</span></div>
        <div class="aw-preloader__sub">Tech Re-Commerce &amp; Repair · Delhi NCR</div>
        <div class="aw-preloader__meter">
          <div class="aw-preloader__count">00<sup>%</sup></div>
          <div class="aw-preloader__status">${STATUS_LINES[0]}</div>
        </div>
        <div class="aw-preloader__track"><div class="aw-preloader__bar"></div></div>
      </div>
      <div class="aw-preloader__curtain"><i></i><i></i><i></i><i></i><i></i></div>
    `;
    document.body.appendChild(el);
    document.body.classList.add('is-loading');
    document.documentElement.classList.add('aw-mounted');
    return el;
  }

  function runPreloader(el, onDone) {
    if (REDUCED) {
      el.remove();
      document.body.classList.remove('is-loading');
      onDone();
      return;
    }

    const countEl = qs('.aw-preloader__count', el);
    const barEl = qs('.aw-preloader__bar', el);
    const statusEl = qs('.aw-preloader__status', el);

    // Full brand moment on the first visit; a quick wipe on every page after,
    // so internal navigation never feels gated.
    let seen = false;
    try { seen = sessionStorage.getItem('bss_aw_seen') === '1'; } catch (e) {}
    try { sessionStorage.setItem('bss_aw_seen', '1'); } catch (e) {}

    const started = performance.now();
    const MIN_MS = seen ? 550 : 1500;   // let the brand moment land
    const MAX_MS = seen ? 1800 : 4200;  // never hold the page hostage
    let windowLoaded = document.readyState === 'complete';
    let progress = 0;

    window.addEventListener('load', () => { windowLoaded = true; }, { once: true });

    let finished = false;

    const tick = () => {
      const elapsed = performance.now() - started;
      const canFinish = (windowLoaded && elapsed > MIN_MS) || elapsed > MAX_MS;
      const ceiling = canFinish ? 100 : 92;
      // Time-based (not frame-based) so the pace is identical on any refresh rate.
      const target = Math.min(92, 92 * (1 - Math.pow(1 - Math.min(1, elapsed / MIN_MS), 2.2)));
      progress = canFinish ? Math.min(100, Math.max(progress, target) + 4.5) : Math.max(progress, target);
      if (progress > ceiling) progress = ceiling;

      const shown = Math.floor(progress);
      countEl.innerHTML = `${String(shown).padStart(2, '0')}<sup>%</sup>`;
      barEl.style.width = `${progress}%`;
      statusEl.textContent = STATUS_LINES[
        Math.min(STATUS_LINES.length - 1, Math.floor(progress / 100 * STATUS_LINES.length))
      ];

      if (progress >= 99.6) finish();
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      clearTimeout(failsafe);
      countEl.innerHTML = '100<sup>%</sup>';
      barEl.style.width = '100%';

      setTimeout(() => {
        el.classList.add('is-done');
        document.body.classList.remove('is-loading');
        onDone();
        setTimeout(() => el.remove(), 1600);
      }, 220);
    };

    // setInterval rather than rAF: background tabs and low-power modes throttle
    // rAF hard, and the overlay must never outlive its welcome.
    const timer = setInterval(tick, 1000 / 30);
    // Absolute backstop — the page is revealed even if something above stalls.
    const failsafe = setTimeout(finish, MAX_MS + 800);
    tick();
  }

  /* ======================================================================
     2. AMBIENT CHROME
     ====================================================================== */
  function mountAmbient() {
    if (!REDUCED) {
      const grain = document.createElement('div');
      grain.className = 'aw-grain';
      grain.setAttribute('aria-hidden', 'true');
      document.body.appendChild(grain);
    }

    const progress = document.createElement('div');
    progress.className = 'aw-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);

    let ticking = false;
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      progress.style.transform = `scaleX(${ratio})`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; raf(updateProgress); }
    }, { passive: true });
    updateProgress();
  }

  function mountCursor() {
    if (!FINE_POINTER || REDUCED) return;

    const ring = document.createElement('div');
    ring.className = 'aw-cursor';
    const dot = document.createElement('div');
    dot.className = 'aw-cursor-dot';
    ring.setAttribute('aria-hidden', 'true');
    dot.setAttribute('aria-hidden', 'true');
    document.body.append(ring, dot);

    let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    let rx = tx, ry = ty;

    window.addEventListener('mousemove', e => {
      tx = e.clientX;
      ty = e.clientY;
      dot.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      document.body.classList.add('aw-cursor-ready');
    }, { passive: true });

    const loop = () => {
      // Ring trails the dot with a light spring for a liquid feel.
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf(loop);
    };
    loop();

    const HOVERABLE = 'a, button, .journey-card, .product-card, .service-card, ' +
                      '.category-tile, .component-pill, .accordion button, input, select';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(HOVERABLE)) document.body.classList.add('aw-cursor-hover');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(HOVERABLE)) document.body.classList.remove('aw-cursor-hover');
    });
  }

  /* ======================================================================
     3. TEXT SPLITTING
     ====================================================================== */

  /** Splits a headline on <br> into masked lines that slide up. */
  function splitLines(h) {
    if (!h || h.dataset.awSplit === 'lines') return;
    const parts = h.innerHTML.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    h.innerHTML = parts
      .map(part => `<span class="aw-line"><i>${part}</i></span>`)
      .join('');
    h.dataset.awSplit = 'lines';
  }

  /** Splits a heading into words that rise into place on reveal. */
  function splitWords(h) {
    if (!h || h.dataset.awSplit) return;
    // Only handle plain-text headings so nested markup is never destroyed.
    if (h.children.length) return;
    const words = h.textContent.trim().split(/\s+/);
    if (words.length < 2) return;
    h.innerHTML = words
      .map((w, i) => `<span class="aw-word" style="transition-delay:${(i * 0.045).toFixed(3)}s">${w}</span>`)
      .join(' ');
    h.dataset.awSplit = 'words';
  }

  /* ======================================================================
     4. REVEAL TAGGING + OBSERVER
     ====================================================================== */

  // selector -> reveal style. Applied in order; first match wins per element.
  const REVEAL_MAP = [
    ['.section-head', 'up'],
    ['.hero-mockup-left', 'left'],
    ['.hero-mockup-right', 'right'],
    ['.category-header-wrap', 'up'],
    ['.category-card', 'up'],
    ['.hero-features', 'up'],
    ['.trust-ribbon', 'down'],
    ['.promo > div', 'left'],
    ['.promo > img', 'right'],
    ['.pickup-banner > div', 'up'],
    ['.repair-well', 'mask'],
    ['.steps-card', 'up'],
    ['.brand-rail', 'zoom'],
    ['.faq .accordion', 'up'],
    ['.accordion', 'up'],
    ['.page-hero', 'up'],
    ['.detail-gallery', 'left'],
    ['.detail-summary', 'right'],
    ['.filter-sidebar', 'left'],
    ['.contact-card', 'up'],
    ['.form-card', 'up'],
    ['.policy-block', 'up'],
    ['section > .container > img', 'zoom']
  ];

  const STAGGER_SELECTORS = [
    '.category-cards-grid',
    '.journey-grid',
    '.product-grid',
    '.service-grid',
    '.category-grid',
    '.component-strip',
    '.hero-features',
    '.process-list',
    '.footer-grid',
    '.spec-table',
    '.steps-pair'
  ];

  function tagDOM(root = document) {
    // Grids stagger their children.
    STAGGER_SELECTORS.forEach(sel => {
      qsa(sel, root).forEach(el => {
        if (!el.hasAttribute('data-aw-stagger')) el.setAttribute('data-aw-stagger', '');
      });
    });

    // Individual blocks get a directional reveal.
    REVEAL_MAP.forEach(([sel, kind]) => {
      qsa(sel, root).forEach(el => {
        if (el.hasAttribute('data-aw-reveal') || el.hasAttribute('data-aw-stagger')) return;
        if (el.closest('.aw-preloader, .site-header, .mobile-drawer')) return;
        el.setAttribute('data-aw-reveal', kind);
      });
    });

    // Section headings animate word by word.
    qsa('.section-head h2, .page-hero h1, .steps-card h2, .promo h2, .pickup-banner h2', root)
      .forEach(splitWords);
  }

  let observer;
  function observeAll(root = document) {
    if (!observer) return;
    qsa('[data-aw-reveal], [data-aw-stagger]', root).forEach(el => {
      if (el.dataset.awObserved) return;
      el.dataset.awObserved = '1';
      observer.observe(el);
    });
  }

  function initObserver() {
    if (REDUCED || !('IntersectionObserver' in window)) {
      qsa('[data-aw-reveal], [data-aw-stagger]').forEach(el => el.classList.add('is-in'));
      return;
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, {
      // Fire slightly before the element is fully on screen.
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.12
    });

    observeAll();
  }

  /* ======================================================================
     5. HERO
     ====================================================================== */
  function initHero() {
    const h1 = qs('.hero-copy h1');
    const heroPanel = qs('.hero-panel');
    if (!h1 || !heroPanel) return;

    splitLines(h1);
    requestAnimationFrame(() => heroPanel.classList.add('aw-ready'));

    // The hero tab switcher rewrites the headline; re-split each time.
    const reSplit = () => {
      if (h1.dataset.awSplit === 'lines') return;
      splitLines(h1);
      heroPanel.classList.remove('aw-ready');
      raf(() => raf(() => heroPanel.classList.add('aw-ready')));
    };
    new MutationObserver(() => {
      if (!h1.querySelector('.aw-line')) {
        delete h1.dataset.awSplit;
        reSplit();
      }
    }).observe(h1, { childList: true });

    // Copy + CTAs enter after the headline.
    const stack = [qs('.hero-copy .eyebrow'), qs('.hero-copy p'), qs('.hero-actions'), qs('.hero-art')];
    stack.forEach((el, i) => {
      if (!el || REDUCED) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(26px)';
      el.style.transition = 'opacity .8s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1)';
      el.style.transitionDelay = `${0.25 + i * 0.11}s`;
      raf(() => raf(() => {
        el.style.opacity = '';
        el.style.transform = '';
      }));
    });

    // Pointer parallax on the hero artwork.
    const art = qs('.hero-art img');
    if (art && FINE_POINTER && !REDUCED) {
      heroPanel.addEventListener('pointermove', e => {
        const r = heroPanel.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        art.style.transform =
          `perspective(1000px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translate3d(${px * 18}px, ${py * 18}px, 0)`;
      });
      heroPanel.addEventListener('pointerleave', () => { art.style.transform = ''; });
    }
  }

  /* ======================================================================
     6. HEADER BEHAVIOUR
     ====================================================================== */
  function initHeader() {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      document.body.classList.toggle('aw-scrolled', y > 40);

      // Hide on downward scroll past the hero; always reveal on scroll up.
      const goingDown = y > lastY;
      const drawerOpen = document.body.classList.contains('no-scroll');
      document.body.classList.toggle('aw-nav-hidden', goingDown && y > 420 && !drawerOpen);

      lastY = y;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; raf(update); }
    }, { passive: true });
    update();
  }

  /* ======================================================================
     7. POINTER-REACTIVE CARDS (glow + tilt)
     ====================================================================== */
  const GLOW_TARGETS = '.journey-card, .product-card, .service-card, .category-tile';

  function initCardPointer() {
    if (!FINE_POINTER || REDUCED) return;

    document.addEventListener('pointermove', e => {
      const card = e.target.closest(GLOW_TARGETS);
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* ======================================================================
     8. MAGNETIC BUTTONS
     ====================================================================== */
  function initMagnetic() {
    if (!FINE_POINTER || REDUCED) return;

    const targets = qsa('.hero-actions .btn, .promo .btn, .pickup-banner .btn, .whatsapp-float, .section-head .btn');
    targets.forEach(btn => {
      if (btn.dataset.awMagnetic) return;
      btn.dataset.awMagnetic = '1';
      btn.classList.add('aw-magnetic');

      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate3d(${dx * 0.22}px, ${dy * 0.32}px, 0)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ======================================================================
     9. NUMBER COUNTERS
     ====================================================================== */
  const NUM_RE = /^([^\d]*)(\d[\d,.]*)(.*)$/s;

  function initCounters() {
    if (REDUCED || !('IntersectionObserver' in window)) return;

    // Short, numeric, self-contained strings only — never body copy.
    const candidates = qsa('.offer-bubble, .badge, .step-num, .stat-value, .rating-row strong')
      .filter(el => !el.dataset.awCounter && NUM_RE.test(el.textContent.trim()) && el.textContent.trim().length <= 12);

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    candidates.forEach(el => {
      el.dataset.awCounter = '1';
      el.classList.add('aw-counter');
      io.observe(el);
    });
  }

  function countUp(el) {
    const nodes = [...el.childNodes].filter(n => n.nodeType === 3 && NUM_RE.test(n.nodeValue.trim()));
    const node = nodes[0];
    if (!node) return;

    const m = node.nodeValue.trim().match(NUM_RE);
    if (!m) return;
    const [, pre, raw, post] = m;
    const decimals = (raw.split('.')[1] || '').length;
    const target = parseFloat(raw.replace(/,/g, ''));
    if (!isFinite(target) || target === 0) return;

    const DURATION = 1100;
    const start = performance.now();
    const step = now => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      node.nodeValue = `${pre}${(target * eased).toFixed(decimals)}${post}`;
      if (t < 1) raf(step);
      else node.nodeValue = `${pre}${raw}${post}`;
    };
    raf(step);
  }

  /* ======================================================================
     10. BRAND MARQUEE
     ====================================================================== */
  function initMarquee() {
    qsa('.brand-rail').forEach(rail => {
      if (rail.dataset.awMarquee) return;
      rail.dataset.awMarquee = '1';

      const track = document.createElement('div');
      track.className = 'aw-marquee-track';
      while (rail.firstChild) track.appendChild(rail.firstChild);

      // A clone makes the translateX(-100%) loop seamless.
      const clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      rail.append(track, clone);
    });
  }

  /* ======================================================================
     11. DYNAMIC CONTENT WATCHER
     Product/service cards are injected by other scripts after load, so
     re-tag and re-observe whenever a grid's children change.
     ====================================================================== */
  function watchDynamicGrids() {
    const grids = qsa(STAGGER_SELECTORS.join(', '));
    if (!grids.length) return;

    const mo = new MutationObserver(muts => {
      let touched = false;
      muts.forEach(m => { if (m.addedNodes.length) touched = true; });
      if (!touched) return;
      tagDOM();
      observeAll();
      initMagnetic();
      initCounters();
    });

    grids.forEach(g => mo.observe(g, { childList: true }));
  }

  /* ======================================================================
     BOOT
     ====================================================================== */
  function start() {
    const preloader = mountPreloader();

    mountAmbient();
    mountCursor();
    initHeader();
    initCardPointer();

    runPreloader(preloader, () => {
      // Content-facing motion begins only once the curtain is lifting.
      tagDOM();
      initMarquee();
      initObserver();
      initHero();
      initMagnetic();
      initCounters();
      watchDynamicGrids();

      // The shell (header/footer) is injected by app.js; catch anything late.
      setTimeout(() => {
        tagDOM();
        observeAll();
        initMarquee();
        initMagnetic();
      }, 260);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
