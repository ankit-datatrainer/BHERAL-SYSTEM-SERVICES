'use client';

/**
 * Global header — a React port of the static site's current shell:
 * utility ticker, logo lockup, scoped search with live autocomplete,
 * action rail, the SHOP BY CATEGORY dropdown, mega menus and mobile drawer.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { imageUrl, money, PHONE_DISPLAY } from '@/lib/format';
import type { SearchHit } from '@/lib/types';
import { useStore } from './StoreProvider';

interface MegaLink {
  href: string;
  icon?: string;
  logo?: string;
  label: string;
}

const SHOP_CATEGORIES: Array<MegaLink | 'divider'> = [
  { href: '/buy?category=Laptop', icon: 'laptop_mac', label: 'Laptops' },
  { href: '/buy?category=Desktop', icon: 'desktop_windows', label: 'Desktops & Workstations' },
  { href: '/buy?category=Monitor', icon: 'tv', label: 'Monitors' },
  { href: '/buy?category=Printer', icon: 'print', label: 'Printers' },
  { href: '/buy?brand=Apple', logo: '/assets/images/brands/apple.svg', label: 'Apple MacBooks' },
  { href: '/buy?condition=New', icon: 'new_releases', label: 'Brand New Stock' },
  'divider',
  { href: '/marketplace', icon: 'storefront', label: 'Marketplace (Private Sellers)' },
  { href: '/marketplace/sell', icon: 'sell', label: 'Sell Your Own Item' },
  { href: '/marketplace/purchases', icon: 'receipt_long', label: 'My Purchases' },
  { href: '/parts', icon: 'memory', label: 'Computer Parts' },
  { href: '/repair', icon: 'handyman', label: 'Repair Services' },
  { href: '/sell', icon: 'currency_rupee', label: 'Sell Your Device' },
];

const LAPTOP_MENU: MegaLink[] = [
  { href: '/buy?category=Laptop', icon: 'laptop', label: 'All Laptops' },
  { href: '/buy?category=Laptop&gpu=Dedicated', icon: 'sports_esports', label: 'Gaming & Graphics' },
  { href: '/buy?category=Laptop&condition=Excellent', icon: 'business_center', label: 'Business Grade A' },
  { href: '/buy?category=Laptop&ram=16,32', icon: 'developer_board', label: '16GB+ Memory' },
  { href: '/buy?category=Desktop', icon: 'desktop_windows', label: 'Desktops' },
  { href: '/buy?sort=discount', icon: 'verified', label: 'Biggest Discounts' },
];

const BRANDS_MENU: MegaLink[] = [
  { href: '/buy?brand=Apple', logo: '/assets/images/brands/apple.svg', label: 'Apple' },
  { href: '/buy?brand=Lenovo', logo: '/assets/images/brands/lenovo.svg', label: 'Lenovo ThinkPad' },
  { href: '/buy?brand=Dell', logo: '/assets/images/brands/dell.svg', label: 'Dell Latitude & XPS' },
  { href: '/buy?brand=HP', logo: '/assets/images/brands/hp.svg', label: 'HP EliteBook' },
  { href: '/buy?brand=ASUS', logo: '/assets/images/brands/asus.svg', label: 'ASUS ROG' },
  { href: '/buy?brand=Acer', logo: '/assets/images/brands/acer.svg', label: 'Acer' },
  { href: '/buy?brand=MSI', logo: '/assets/images/brands/msi.svg', label: 'MSI Gaming' },
  { href: '/buy?brand=Samsung', logo: '/assets/images/brands/samsung.svg', label: 'Samsung' },
];

const ACCESSORIES_MENU: MegaLink[] = [
  { href: '/parts?category=Charger', icon: 'power', label: 'Chargers & Adapters' },
  { href: '/parts?category=RAM', icon: 'developer_board', label: 'RAM Memory' },
  { href: '/parts?category=SSD', icon: 'hard_drive', label: 'SSDs' },
  { href: '/parts?category=HDD', icon: 'album', label: 'Hard Drives' },
  { href: '/parts?category=Graphics Card', icon: 'memory', label: 'Graphics Cards' },
  { href: '/parts', icon: 'extension', label: 'All Accessories' },
];

const SEARCH_SCOPES = [
  { value: 'all', label: 'All Categories' },
  { value: 'Laptop', label: 'Laptops' },
  { value: 'Desktop', label: 'Desktops' },
  { value: 'Parts', label: 'Computer Parts' },
  { value: 'Repair', label: 'Repairs' },
];

const MOBILE_LINKS = [
  { href: '/', icon: 'home', label: 'Home' },
  { href: '/buy', icon: 'shopping_bag', label: 'Buy Refurbished Laptops' },
  { href: '/sell', icon: 'currency_rupee', label: 'Sell Your Device' },
  { href: '/repair', icon: 'handyman', label: 'Book Computer Repair' },
  { href: '/marketplace', icon: 'storefront', label: 'Marketplace' },
  { href: '/marketplace/sell', icon: 'sell', label: 'Sell Your Own Item' },
  { href: '/marketplace/purchases', icon: 'receipt_long', label: 'My Purchases' },
  { href: '/parts', icon: 'memory', label: 'Computer Parts & SSD' },
  { href: '/contact?type=corporate', icon: 'business', label: 'Corporate Bulk Deals' },
  { href: '/wishlist', icon: 'favorite', label: 'Saved Wishlist' },
  { href: '/cart', icon: 'shopping_cart', label: 'Shopping Cart' },
  { href: '/track', icon: 'local_shipping', label: 'Track Any Request' },
  { href: '/contact', icon: 'support_agent', label: 'Contact & Store Info' },
];

function LogoMark() {
  return (
    <div className="logo-icon-wrap">
      <svg width="34" height="28" viewBox="0 0 32 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="3" y="2" width="26" height="18" rx="2" stroke="#111827" strokeWidth="2.5" />
        <rect x="6" y="5" width="20" height="12" fill="#EBF3FF" />
        <path
          d="M1 22C1 20.8954 1.89543 20 3 20H29C30.1046 20 31 20.8954 31 22V23C31 23.5523 30.5523 24 30 24H2C1.44772 24 1 23.5523 1 23V22Z"
          fill="#111827"
        />
        <path d="M12 21H20" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function MegaMenu({ title, href, links }: { title: string; href: string; links: MegaLink[] }) {
  return (
    <div className="nav-item">
      <Link className="nav-link" href={href}>
        {title} <span className="icon nav-chevron">expand_more</span>
      </Link>
      <div className="mega-menu">
        {links.map((l) => (
          <Link key={l.href + l.label} className="mega-item" href={l.href}>
            {l.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={l.logo}
                alt={l.label}
                style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0, marginRight: 8 }}
              />
            ) : l.icon ? (
              <span className="icon">{l.icon}</span>
            ) : null}
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { cartCount, wishlist, hydrated } = useStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const shopRef = useRef<HTMLDivElement>(null);

  // Close transient UI whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
    setSuggestOpen(false);
    setShopOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', drawerOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [drawerOpen]);

  // Debounced autocomplete.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { results } = await api.search(term, scope);
        if (!cancelled) {
          setHits(results);
          setActiveIndex(-1);
          setSuggestOpen(true);
        }
      } catch {
        if (!cancelled) setHits([]);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, scope]);

  // Dismiss the suggestion list and the category dropdown on outside clicks.
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSuggestOpen(false);
      if (!shopRef.current?.contains(e.target as Node)) setShopOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSuggestOpen(false);
        setShopOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const submitSearch = () => {
    const term = query.trim();
    if (!term) return;
    setSuggestOpen(false);
    const scopeParam = scope !== 'all' && scope !== 'Repair' && scope !== 'Parts' ? `&category=${encodeURIComponent(scope)}` : '';
    router.push(`/buy?q=${encodeURIComponent(term)}${scopeParam}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hits.length) {
      if (e.key === 'Enter') submitSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) {
        setSuggestOpen(false);
        router.push(hits[activeIndex].href);
      } else {
        submitSearch();
      }
    }
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href.split('?')[0]);

  return (
    <>
      <header className="site-header">
        <div className="utility">
          <div className="container">
            <div className="utility-left">
              <span className="utility-item">
                <span className="icon" style={{ fontSize: 15 }}>location_on</span> Sector 11, Rohini, New Delhi 110085
              </span>
            </div>
            <div className="utility-center">
              <span className="utility-item">
                <span className="icon" style={{ fontSize: 16 }}>local_shipping</span> Doorstep Pickup &amp; Delivery across Delhi NCR
              </span>
            </div>
            <div className="utility-right">
              <a href="tel:+919654779949" className="utility-item">
                <span className="icon" style={{ fontSize: 15 }}>call</span> {PHONE_DISPLAY}
              </a>
              <span className="utility-sep">|</span>
              <Link href="/track" className="utility-item">Track Order</Link>
              <span className="utility-sep">|</span>
              <Link href="/contact" className="utility-item">Help Center</Link>
            </div>
          </div>
        </div>

        <div className="container header-main">
          <button
            className="icon-btn mobile-trigger"
            aria-label="Open mobile menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <span className="icon" style={{ fontSize: 26 }}>menu</span>
          </button>

          <Link className="logo" href="/">
            <LogoMark />
            <div className="logo-text">
              <span className="brand-title">
                BHERAL SYSTEM <span className="text-primary">&amp; SERVICES</span>
              </span>
              <small className="brand-sub">Tech Re-Commerce &amp; Repair</small>
            </div>
          </Link>

          <div className="search-wrap" ref={searchWrapRef}>
            <div className="searchbar">
              <input
                type="search"
                placeholder="Search laptops, brands, categories..."
                autoComplete="off"
                aria-label="Search site products and services"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => hits.length && setSuggestOpen(true)}
                onKeyDown={onKeyDown}
              />
              <div className="search-category-wrap">
                <select
                  className="search-category-select"
                  aria-label="Filter search category"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  {SEARCH_SCOPES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <button type="button" aria-label="Execute search" onClick={submitSearch}>
                <span className="icon">search</span>
              </button>
            </div>

            <div
              className={`suggestions${suggestOpen && hits.length ? ' open' : ''}`}
              role="listbox"
              aria-label="Search suggestions"
            >
              {hits.map((hit, i) => (
                <Link
                  key={`${hit.isService ? 's' : 'p'}-${hit.id}`}
                  className={`suggestion-item${i === activeIndex ? ' active' : ''}`}
                  href={hit.href}
                  role="option"
                  aria-selected={i === activeIndex}
                  onClick={() => setSuggestOpen(false)}
                >
                  {hit.isService ? (
                    <span className="icon" style={{ fontSize: 26, color: 'var(--primary)' }}>{hit.icon}</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl(hit.image)} alt="" />
                  )}
                  <div className="suggestion-item-info">
                    <strong>{hit.name}</strong>
                    <small>
                      {hit.category}
                      {hit.price !== undefined ? ` · ${money(hit.price)}` : ''}
                    </small>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="header-actions">
            <Link className="header-action-item" href="/buy?sort=discount" title="Best deals">
              <div className="action-icon-wrap">
                <span className="icon">swap_horiz</span>
              </div>
              <span className="action-label">Compare</span>
            </Link>
            <Link className="header-action-item wishlist-link" href="/wishlist" title="View wishlist">
              <div className="action-icon-wrap">
                <span className="icon">favorite_border</span>
                <span className="count wishlist-count">{hydrated ? wishlist.length : 0}</span>
              </div>
              <span className="action-label">Wishlist</span>
            </Link>
            <Link className="header-action-item" href="/cart" title="View cart">
              <div className="action-icon-wrap">
                <span className="icon">shopping_cart</span>
                <span className="count cart-count">{hydrated ? cartCount : 0}</span>
              </div>
              <span className="action-label">Cart</span>
            </Link>
            <Link className="header-action-item" href="/contact?action=signin" title="Sign In">
              <div className="action-icon-wrap">
                <span className="icon">person_outline</span>
              </div>
              <span className="action-label">Sign In</span>
            </Link>
          </div>
        </div>

        <div className="nav-row">
          <div className="container">
            <div className="nav-row-inner">
              <div className={`shop-category-wrapper${shopOpen ? ' open' : ''}`} ref={shopRef}>
                <button
                  className="btn-shop-category"
                  aria-expanded={shopOpen}
                  type="button"
                  onClick={() => setShopOpen((o) => !o)}
                >
                  <span className="icon">menu</span>
                  <span>SHOP BY CATEGORY</span>
                </button>
                <div className="shop-category-dropdown">
                  {SHOP_CATEGORIES.map((item, i) =>
                    item === 'divider' ? (
                      <div className="dropdown-divider" key={`div-${i}`} />
                    ) : (
                      <Link href={item.href} className="cat-drop-item" key={item.href + item.label}>
                        {item.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.logo}
                            alt={item.label}
                            style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0, marginRight: 8 }}
                          />
                        ) : (
                          <span className="icon">{item.icon}</span>
                        )}
                        {item.label}
                      </Link>
                    ),
                  )}
                </div>
              </div>

              <nav className="desktop-nav" aria-label="Main Store Navigation">
                <Link className={`nav-link${isActive('/') ? ' active' : ''}`} href="/">HOME</Link>
                <MegaMenu title="LAPTOPS" href="/buy" links={LAPTOP_MENU} />
                <MegaMenu title="BRANDS" href="/buy" links={BRANDS_MENU} />
                <MegaMenu title="ACCESSORIES" href="/parts" links={ACCESSORIES_MENU} />
                <Link className={`nav-link${isActive('/marketplace') ? ' active' : ''}`} href="/marketplace">MARKETPLACE</Link>
                <Link className="nav-link" href="/buy?sort=discount">DEALS</Link>
                <Link className="nav-link" href="/sell">SELL DEVICE</Link>
                <Link className={`nav-link${isActive('/repair') ? ' active' : ''}`} href="/repair">REPAIR</Link>
                <Link className="nav-link" href="/contact?type=corporate">BUSINESS STORE</Link>
                <Link className={`nav-link${isActive('/track') ? ' active' : ''}`} href="/track">TRACK ORDER</Link>
                <Link className={`nav-link${isActive('/contact') ? ' active' : ''}`} href="/contact">CONTACT US</Link>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <div
        className={`drawer-scrim${drawerOpen ? ' open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside className={`mobile-drawer${drawerOpen ? ' open' : ''}`} aria-hidden={!drawerOpen}>
        <div className="mobile-drawer-head">
          <Link className="logo" href="/">
            <LogoMark />
            <div className="logo-text">
              <span className="brand-title">BHERAL SYSTEM <span className="text-primary">&amp; SERVICES</span></span>
              <small className="brand-sub">Tech Re-Commerce &amp; Repair</small>
            </div>
          </Link>
          <button className="icon-btn drawer-close" aria-label="Close navigation drawer" onClick={() => setDrawerOpen(false)}>
            <span className="icon">close</span>
          </button>
        </div>
        <nav className="mobile-nav">
          {MOBILE_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(l.href) ? 'active' : ''}>
              <span className="icon">{l.icon}</span> {l.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
