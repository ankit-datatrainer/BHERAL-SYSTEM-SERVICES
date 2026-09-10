/**
 * Motion engine — TypeScript port of the static site's js/award.js.
 *
 * Split into a one-time `bootMotion()` (preloader, grain, cursor, scroll
 * chrome) and a `refreshMotion()` that re-tags the DOM. React calls the
 * latter on every route change and whenever a list finishes rendering, so
 * client-rendered content animates exactly like server-rendered content.
 */

const STATUS_LINES = [
  'Booting re-commerce lab',
  'Loading certified inventory',
  'Syncing repair bench',
  'Calibrating valuations',
  'Ready',
];

/**
 * Query helper that skips React's hidden Suspense streaming buffers. Those
 * contain a full copy of the pending subtree, so tagging inside them would
 * double the observed element count for content the user never sees.
 */
const qsa = <T extends Element>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(sel)).filter((el) => !el.closest('[hidden]'));

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Which reveal style each block gets. First match wins. */
const REVEAL_MAP: Array<[string, string]> = [
  ['.section-head', 'up'],
  ['.hero-features', 'up'],
  ['.trust-ribbon', 'down'],
  ['.promo > div', 'left'],
  ['.promo > img', 'right'],
  ['.pickup-banner > div', 'up'],
  ['.repair-well', 'mask'],
  ['.steps-card', 'up'],
  ['.brand-rail', 'zoom'],
  ['.accordion', 'up'],
  ['.page-hero', 'up'],
  ['.detail-gallery', 'left'],
  ['.detail-summary', 'right'],
  ['.filter-sidebar', 'left'],
  ['.form-card', 'up'],
  ['.cart-card', 'up'],
  ['.wizard-card', 'up'],
  ['.wizard-side', 'left'],
  ['.policy-block', 'up'],
];

const STAGGER_SELECTORS = [
  '.journey-grid',
  '.product-grid',
  '.service-grid',
  '.category-grid',
  '.component-strip',
  '.hero-features',
  '.process-list',
  '.footer-grid',
  '.steps-pair',
];

let observer: IntersectionObserver | null = null;
let booted = false;

// ---------------------------------------------------------------------------
// Reveal system
// ---------------------------------------------------------------------------

function splitWords(el: HTMLElement): void {
  if (el.dataset.awSplit || el.children.length) return;
  const words = el.textContent?.trim().split(/\s+/) ?? [];
  if (words.length < 2) return;
  el.innerHTML = words
    .map(
      (w, i) =>
        `<span class="aw-word" style="transition-delay:${(i * 0.045).toFixed(3)}s">${w}</span>`,
    )
    .join(' ');
  el.dataset.awSplit = 'words';
}

function tagDOM(): void {
  for (const sel of STAGGER_SELECTORS) {
    for (const el of qsa<HTMLElement>(sel)) {
      if (!el.hasAttribute('data-aw-stagger')) el.setAttribute('data-aw-stagger', '');
    }
  }

  for (const [sel, kind] of REVEAL_MAP) {
    for (const el of qsa<HTMLElement>(sel)) {
      if (el.hasAttribute('data-aw-reveal') || el.hasAttribute('data-aw-stagger')) continue;
      if (el.closest('.aw-preloader, .site-header, .mobile-drawer')) continue;
      el.setAttribute('data-aw-reveal', kind);
    }
  }

  for (const el of qsa<HTMLElement>(
    '.section-head h2, .page-hero h1, .steps-card h2, .promo h2, .pickup-banner h2',
  )) {
    splitWords(el);
  }
}

function observeAll(): void {
  if (!observer) {
    // No observer means reduced motion or an old browser: show everything.
    for (const el of qsa('[data-aw-reveal], [data-aw-stagger]')) el.classList.add('is-in');
    return;
  }
  for (const el of qsa<HTMLElement>('[data-aw-reveal], [data-aw-stagger]')) {
    if (el.dataset.awObserved) continue;
    el.dataset.awObserved = '1';
    observer.observe(el);
  }
}

/** Re-tag and re-observe. Safe to call as often as you like. */
export function refreshMotion(): void {
  if (typeof window === 'undefined') return;
  tagDOM();
  observeAll();
  initMarquee();
  initMagnetic();
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

/** Splits a headline on <br> into masked lines that slide up. */
export function splitHeroLines(h1: HTMLElement | null): void {
  if (!h1 || h1.dataset.awSplit === 'lines') return;
  const parts = h1.innerHTML
    .split(/<br\s*\/?>/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return;
  h1.innerHTML = parts.map((p) => `<span class="aw-line"><i>${p}</i></span>`).join('');
  h1.dataset.awSplit = 'lines';
}

// ---------------------------------------------------------------------------
// Marquee / magnetic buttons / card glow
// ---------------------------------------------------------------------------

function initMarquee(): void {
  for (const rail of qsa<HTMLElement>('.brand-rail')) {
    if (rail.dataset.awMarquee) continue;
    rail.dataset.awMarquee = '1';

    const track = document.createElement('div');
    track.className = 'aw-marquee-track';
    while (rail.firstChild) track.appendChild(rail.firstChild);

    const clone = track.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    rail.append(track, clone);
  }
}

function initMagnetic(): void {
  if (!finePointer() || prefersReducedMotion()) return;

  const targets = qsa<HTMLElement>(
    '.hero-actions .btn, .promo .btn, .pickup-banner .btn, .whatsapp-float, .section-head .btn',
  );

  for (const btn of targets) {
    if (btn.dataset.awMagnetic) continue;
    btn.dataset.awMagnetic = '1';
    btn.classList.add('aw-magnetic');

    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      btn.style.transform = `translate3d(${dx * 0.22}px, ${dy * 0.32}px, 0)`;
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.transform = '';
    });
  }
}

const GLOW_TARGETS = '.journey-card, .product-card, .service-card, .category-tile';

function initCardPointer(): void {
  if (!finePointer() || prefersReducedMotion()) return;
  document.addEventListener(
    'pointermove',
    (e) => {
      const card = (e.target as Element | null)?.closest<HTMLElement>(GLOW_TARGETS);
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    },
    { passive: true },
  );
}

// ---------------------------------------------------------------------------
// Ambient chrome
// ---------------------------------------------------------------------------

function mountAmbient(): void {
  if (!prefersReducedMotion() && !document.querySelector('.aw-grain')) {
    const grain = document.createElement('div');
    grain.className = 'aw-grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grain);
  }

  if (document.querySelector('.aw-progress')) return;

  const progress = document.createElement('div');
  progress.className = 'aw-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

function mountCursor(): void {
  if (!finePointer() || prefersReducedMotion() || document.querySelector('.aw-cursor')) return;

  const ring = document.createElement('div');
  ring.className = 'aw-cursor';
  const dot = document.createElement('div');
  dot.className = 'aw-cursor-dot';
  ring.setAttribute('aria-hidden', 'true');
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(ring, dot);

  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let rx = tx;
  let ry = ty;

  window.addEventListener(
    'mousemove',
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
      dot.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      document.body.classList.add('aw-cursor-ready');
    },
    { passive: true },
  );

  const loop = () => {
    rx += (tx - rx) * 0.16;
    ry += (ty - ry) * 0.16;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();

  const HOVERABLE =
    'a, button, .journey-card, .product-card, .service-card, .category-tile, .component-pill, .accordion button, input, select';
  document.addEventListener('mouseover', (e) => {
    if ((e.target as Element | null)?.closest(HOVERABLE)) {
      document.body.classList.add('aw-cursor-hover');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if ((e.target as Element | null)?.closest(HOVERABLE)) {
      document.body.classList.remove('aw-cursor-hover');
    }
  });
}

function initHeader(): void {
  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    document.body.classList.toggle('aw-scrolled', y > 40);
    const drawerOpen = document.body.classList.contains('no-scroll');
    document.body.classList.toggle('aw-nav-hidden', y > lastY && y > 420 && !drawerOpen);
    lastY = y;
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

// ---------------------------------------------------------------------------
// Preloader
// ---------------------------------------------------------------------------

function runPreloader(onDone: () => void): void {
  if (prefersReducedMotion()) {
    document.documentElement.classList.add('aw-mounted');
    onDone();
    return;
  }

  const el = document.createElement('div');
  el.className = 'aw-preloader';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Loading Bheral Systems');
  el.innerHTML = `
    <div class="aw-preloader__aurora"></div>
    <div class="aw-preloader__inner">
      <div class="aw-preloader__mark"><span>BHERAL</span><span>SYSTEMS</span></div>
      <div class="aw-preloader__sub">Tech Re-Commerce &amp; Repair &middot; Delhi NCR</div>
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

  const countEl = el.querySelector<HTMLElement>('.aw-preloader__count')!;
  const barEl = el.querySelector<HTMLElement>('.aw-preloader__bar')!;
  const statusEl = el.querySelector<HTMLElement>('.aw-preloader__status')!;

  // Full brand moment once per session; a quick wipe on later navigations.
  let seen = false;
  try {
    seen = sessionStorage.getItem('bss_aw_seen') === '1';
    sessionStorage.setItem('bss_aw_seen', '1');
  } catch {
    /* storage blocked — treat as first visit */
  }

  const started = performance.now();
  const MIN_MS = seen ? 550 : 1500;
  const MAX_MS = seen ? 1800 : 4200;
  let windowLoaded = document.readyState === 'complete';
  let progress = 0;
  let finished = false;

  window.addEventListener('load', () => {
    windowLoaded = true;
  }, { once: true });

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

  const tick = () => {
    const elapsed = performance.now() - started;
    const canFinish = (windowLoaded && elapsed > MIN_MS) || elapsed > MAX_MS;
    const ceiling = canFinish ? 100 : 92;
    const target = Math.min(92, 92 * (1 - Math.pow(1 - Math.min(1, elapsed / MIN_MS), 2.2)));
    progress = canFinish ? Math.min(100, Math.max(progress, target) + 4.5) : Math.max(progress, target);
    if (progress > ceiling) progress = ceiling;

    countEl.innerHTML = `${String(Math.floor(progress)).padStart(2, '0')}<sup>%</sup>`;
    barEl.style.width = `${progress}%`;
    statusEl.textContent =
      STATUS_LINES[Math.min(STATUS_LINES.length - 1, Math.floor((progress / 100) * STATUS_LINES.length))];

    if (progress >= 99.6) finish();
  };

  // setInterval, not rAF: background tabs throttle rAF and the overlay must
  // never outlive its welcome.
  const timer = setInterval(tick, 1000 / 30);
  const failsafe = setTimeout(finish, MAX_MS + 800);
  tick();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

/** Runs once for the lifetime of the SPA. */
export function bootMotion(): void {
  if (booted || typeof window === 'undefined') return;
  booted = true;

  if (!prefersReducedMotion() && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer?.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    );
  }

  mountAmbient();
  mountCursor();
  initHeader();
  initCardPointer();

  runPreloader(() => refreshMotion());
}
