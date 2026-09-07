/**
 * BHERAL SYSTEMS & SERVICES - GLOBAL APPLICATION CORE & SHELL
 * Manages header, desktop mega menus, mobile drawer, mobile bottom bar,
 * floating WhatsApp, toast notifications, and global state persistence.
 */
window.BSS = (() => {
  'use strict';

  const keys = {
    cart: 'bss_cart',
    wishlist: 'bss_wishlist',
    orders: 'bss_orders',
    sells: 'bss_sell_requests',
    repairs: 'bss_repair_requests',
    sellProgress: 'bss_sell_progress'
  };

  // Safe LocalStorage getters and setters
  const safeGet = (key, fallback = []) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn(`Error reading ${key} from localStorage:`, e);
      return fallback;
    }
  };

  const save = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
    }
  };

  // Format currency in Indian Rupees
  const money = amount => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Sanitize HTML string
  const escapeHTML = str => {
    return String(str ?? '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  };

  // Generate unique human-readable request identifiers
  const uniqueId = prefix => {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${randomDigits}`;
  };

  // Query helpers
  const qs = selector => document.querySelector(selector);
  const qsa = selector => [...document.querySelectorAll(selector)];

  // Seed sample requests if local storage is fresh, enabling immediate tracking demo
  function seedDemoRecords() {
    if (!safeGet(keys.orders).length) {
      save(keys.orders, [
        {
          id: 'BSS-ORD-584920',
          phone: '9876543210',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          status: 2, // Packed
          type: 'order',
          customer: {
            name: 'Rohit Sharma',
            phone: '9876543210',
            email: 'rohit.s@example.com',
            address: 'Flat 402, Pocket B, Mayur Vihar Phase 2',
            city: 'Delhi',
            pincode: '110091'
          },
          items: [{ id: 'lenovo-t14-g2', qty: 1 }],
          total: 34999
        }
      ]);
    }

    if (!safeGet(keys.sells).length) {
      save(keys.sells, [
        {
          id: 'BSS-SELL-839102',
          phone: '9876543210',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          status: 1, // Pickup Scheduled
          type: 'sell',
          device: {
            category: 'Laptop',
            brand: 'Dell',
            model: 'Latitude 7400',
            processor: 'Core i5 / Ryzen 5 (Mainstream)',
            ram: '16GB',
            storage: '512GB',
            condition: 'Good',
            issues: 0
          },
          customer: {
            fullName: 'Anita Verma',
            phone: '9876543210',
            pincode: '110019',
            preferredDate: 'Tomorrow'
          }
        }
      ]);
    }

    if (!safeGet(keys.repairs).length) {
      save(keys.repairs, [
        {
          id: 'BSS-REP-294711',
          phone: '9876543210',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          status: 3, // Diagnosis
          type: 'repair',
          details: {
            device: 'Laptop',
            problem: 'Screen Replacement',
            brand: 'Lenovo',
            model: 'ThinkPad T480',
            method: 'Pickup & Drop',
            description: 'Vertical purple lines after accidental lid pressure.'
          },
          customer: {
            fullName: 'Vikram Singh',
            phone: '9876543210',
            pincode: '110001'
          }
        }
      ]);
    }
  }

  // Toast notification service
  function toast(message, type = 'info') {
    let container = qs('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.innerHTML = `<span class="icon">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span><span>${escapeHTML(message)}</span>`;
    container.appendChild(item);

    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateX(50px)';
      item.style.transition = 'all 0.25s ease';
      setTimeout(() => item.remove(), 250);
    }, 3200);
  }

  // Live cart and wishlist count synchronizer
  function updateCounts() {
    const cart = safeGet(keys.cart);
    const wishlist = safeGet(keys.wishlist);
    const totalCartItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    const totalWishlistItems = wishlist.length;

    qsa('.cart-count').forEach(el => el.textContent = totalCartItems);
    qsa('.wishlist-count').forEach(el => el.textContent = totalWishlistItems);
  }

  // Add item to cart with feedback
  function addCart(id, qty = 1) {
    const cart = safeGet(keys.cart);
    const existing = cart.find(row => row.id === id);

    if (existing) {
      existing.qty = Math.min(10, existing.qty + qty);
    } else {
      cart.push({ id, qty });
    }

    save(keys.cart, cart);
    updateCounts();
    toast('Added to your cart!', 'success');
  }

  // Toggle wishlist state
  function toggleWishlist(id) {
    let list = safeGet(keys.wishlist);
    const index = list.indexOf(id);
    let added = false;

    if (index > -1) {
      list.splice(index, 1);
      toast('Removed from wishlist', 'info');
    } else {
      list.push(id);
      added = true;
      toast('Saved to wishlist!', 'success');
    }

    save(keys.wishlist, list);
    qsa(`[data-wishlist="${id}"]`).forEach(btn => btn.classList.toggle('active', added));
    updateCounts();
    return added;
  }

  // Retrieve single product by id
  function productById(id) {
    return window.BSS_DATA.products.find(p => p.id === id);
  }

  // Universal Product Card Component
  function productCard(product) {
    const isWished = safeGet(keys.wishlist).includes(product.id);
    const conditionClass = product.condition === 'New' ? 'badge-blue' : 'badge-green';
    const conditionText = product.condition === 'New' ? 'Brand New OEM' : `Refurbished ${product.condition}`;

    return `
      <article class="product-card" data-product="${product.id}">
        <div class="product-card-top">
          <span class="badge ${conditionClass}">${conditionText}</span>
          <button class="wish-btn ${isWished ? 'active' : ''}" data-wishlist="${product.id}" aria-label="Toggle wishlist" title="Save to wishlist">
            <span class="icon">favorite</span>
          </button>
        </div>
        <a class="product-image-wrap" href="product.html?id=${product.id}">
          <img src="${product.image}" alt="${escapeHTML(product.name)}" loading="lazy">
        </a>
        <h3><a href="product.html?id=${product.id}">${escapeHTML(product.name)}</a></h3>
        <div class="spec-pills-row">
          ${product.processor && product.processor !== '—' ? `<span class="spec">${escapeHTML(product.processor.split('(')[0].trim())}</span>` : ''}
          ${product.ram ? `<span class="spec">${product.ram}GB RAM</span>` : ''}
          ${product.storage ? `<span class="spec">${product.storage}GB ${product.storageType || 'SSD'}</span>` : ''}
        </div>
        <div class="rating-row">
          <span class="icon" style="font-size:16px;">star</span>
          <strong>${product.rating}</strong>
          <span class="muted">(${product.reviewCount})</span>
          ${product.stock > 0 && product.stock <= 5 ? `<span class="badge badge-amber" style="margin-left:auto;font-size:9px;">Only ${product.stock} Left</span>` : ''}
        </div>
        <div class="price-box">
          <span class="price">${money(product.price)}</span>
          ${product.originalPrice ? `<span class="old-price">${money(product.originalPrice)}</span>` : ''}
          ${product.discount ? `<span class="discount">${product.discount}% OFF</span>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn btn-primary btn-small" data-add-cart="${product.id}">
            <span class="icon" style="font-size:16px;">shopping_bag</span> Add to Cart
          </button>
          <a class="btn btn-secondary btn-small" href="product.html?id=${product.id}">Details</a>
        </div>
      </article>
    `;
  }

  // Header Component Generator
  function renderHeader() {
    return `
      <header class="site-header">
        <!-- Top Dark Utility Bar -->
        <div class="utility">
          <div class="container">
            <div class="utility-left">
              <span class="utility-badge"><span class="icon" style="font-size:16px;">bolt</span> Free Doorstep Pickup & Drop</span>
              <span style="opacity:0.4;">•</span>
              <span>Available for eligible Delhi NCR locations</span>
              <span style="opacity:0.4;">•</span>
              <span>6-Month Replacement Warranty</span>
            </div>
            <div class="utility-right">
              <a href="tel:+919654779949" class="utility-badge"><span class="icon" style="font-size:16px;">call</span> +91 96547 79949</a>
              <span style="opacity:0.4;">•</span>
              <a href="track.html"><span class="icon" style="font-size:15px;margin-right:2px;">local_shipping</span> Track Request</a>
              <span style="opacity:0.4;">•</span>
              <a href="contact.html">Help Center</a>
            </div>
          </div>
        </div>

        <!-- Main Header Row -->
        <div class="container header-main">
          <button class="icon-btn mobile-trigger" aria-label="Open mobile menu">
            <span class="icon" style="font-size:26px;">menu</span>
          </button>

          <a class="logo" href="index.html">
            <img src="assets/images/bheral-logo.svg" alt="Bheral Systems & Services logo">
            <div class="logo-text">
              <strong>BHERAL SYSTEMS</strong>
              <small>Tech Re-Commerce & Repair</small>
            </div>
          </a>

          <!-- Global Searchbar -->
          <div class="search-wrap">
            <div class="searchbar">
              <select class="search-category-select" id="search-cat-scope" aria-label="Filter search category">
                <option value="all">All Categories</option>
                <option value="Laptop">Laptops</option>
                <option value="Desktop">Desktops</option>
                <option value="Parts">Computer Parts</option>
                <option value="Repair">Repairs</option>
              </select>
              <input id="global-search" type="search" placeholder="Search refurbished laptops, parts (e.g. ThinkPad, 16GB RAM, Dell Battery)..." autocomplete="off" aria-label="Search site products and services">
              <button id="global-search-btn" type="button" aria-label="Execute search">
                <span class="icon">search</span>
              </button>
            </div>
            <div class="suggestions" id="search-suggestions" role="listbox" aria-label="Search suggestions"></div>
          </div>

          <!-- Header Actions -->
          <div class="header-actions">
            <div class="location-chip">
              <span class="icon" style="color:var(--primary);font-size:18px;">pin_drop</span>
              <span>Delhi NCR</span>
            </div>
            <a class="icon-btn wishlist-link" href="wishlist.html" aria-label="Wishlist" title="View wishlist">
              <span class="icon">favorite</span>
              <span class="count wishlist-count">0</span>
            </a>
            <a class="icon-btn" href="cart.html" aria-label="Shopping Cart" title="View cart">
              <span class="icon">shopping_bag</span>
              <span class="count cart-count">0</span>
            </a>
            <a class="icon-btn" href="contact.html" aria-label="Account" title="Account & Support">
              <span class="icon">person</span>
            </a>
          </div>

          <a class="btn btn-primary desktop-only" href="sell.html">
            <span class="icon">currency_rupee</span> Sell Your Laptop
          </a>
        </div>

        <!-- Subnavigation & Mega Menus -->
        <div class="nav-row">
          <div class="container">
            <nav class="desktop-nav" aria-label="Main Store Navigation">
              <a class="nav-link" href="index.html">Home</a>

              <!-- BUY Mega Menu -->
              <div class="nav-item">
                <a class="nav-link" href="buy.html">Buy Refurbished <span class="icon" style="font-size:16px;">expand_more</span></a>
                <div class="mega-menu">
                  <a class="mega-item" href="buy.html?category=Laptop"><span class="icon">laptop</span>Refurbished Laptop</a>
                  <a class="mega-item" href="buy.html?category=Desktop"><span class="icon">desktop_windows</span>Desktop</a>
                  <a class="mega-item" href="buy.html?category=Monitor"><span class="icon">tv</span>Monitor</a>
                  <a class="mega-item" href="buy.html?category=Printer"><span class="icon">print</span>Printer</a>
                  <a class="mega-item" href="buy.html?category=SSD"><span class="icon">hard_drive</span>SSD</a>
                  <a class="mega-item" href="buy.html?category=HDD"><span class="icon">album</span>HDD</a>
                  <a class="mega-item" href="buy.html?category=RAM"><span class="icon">developer_board</span>RAM</a>
                  <a class="mega-item" href="buy.html?category=Graphics%20Card"><span class="icon">memory</span>Graphics Card</a>
                  <a class="mega-item" href="buy.html?category=Processor"><span class="icon">stream_apps</span>Processor</a>
                  <a class="mega-item" href="buy.html?category=Motherboard"><span class="icon">check_indeterminate_small</span>Motherboard</a>
                  <a class="mega-item" href="buy.html?category=Battery"><span class="icon">battery_full</span>Battery</a>
                  <a class="mega-item" href="buy.html?category=Charger"><span class="icon">power</span>Charger</a>
                  <a class="mega-item" href="buy.html?category=Accessories"><span class="icon">extension</span>Accessories</a>
                </div>
              </div>

              <!-- SELL Mega Menu -->
              <div class="nav-item">
                <a class="nav-link" href="sell.html">Sell Device <span class="icon" style="font-size:16px;">expand_more</span></a>
                <div class="mega-menu">
                  <a class="mega-item" href="sell.html?category=Laptop"><span class="icon">laptop</span>Sell Laptop</a>
                  <a class="mega-item" href="sell.html?category=Desktop"><span class="icon">desktop_windows</span>Sell Desktop</a>
                  <a class="mega-item" href="sell.html?category=Monitor"><span class="icon">tv</span>Sell Monitor</a>
                  <a class="mega-item" href="sell.html?category=Printer"><span class="icon">print</span>Sell Printer</a>
                  <a class="mega-item" href="sell.html?category=SSD"><span class="icon">hard_drive</span>Sell SSD</a>
                  <a class="mega-item" href="sell.html?category=HDD"><span class="icon">album</span>Sell HDD</a>
                  <a class="mega-item" href="sell.html?category=RAM"><span class="icon">developer_board</span>Sell RAM</a>
                  <a class="mega-item" href="sell.html?category=GPU"><span class="icon">memory</span>Sell GPU</a>
                  <a class="mega-item" href="sell.html?category=Processor"><span class="icon">stream_apps</span>Sell Processor</a>
                  <a class="mega-item" href="sell.html?category=Motherboard"><span class="icon">check_indeterminate_small</span>Sell Motherboard</a>
                </div>
              </div>

              <!-- REPAIR Mega Menu -->
              <div class="nav-item">
                <a class="nav-link" href="repair.html">Repair Services <span class="icon" style="font-size:16px;">expand_more</span></a>
                <div class="mega-menu">
                  <a class="mega-item" href="repair.html?service=Laptop%20Repair"><span class="icon">laptop</span>Laptop Repair</a>
                  <a class="mega-item" href="repair.html?service=Desktop%20Repair"><span class="icon">desktop_windows</span>Desktop Repair</a>
                  <a class="mega-item" href="repair.html?service=Printer%20Repair"><span class="icon">print</span>Printer Repair</a>
                  <a class="mega-item" href="repair.html?service=Screen%20Replacement"><span class="icon">monitor</span>Screen Repair</a>
                  <a class="mega-item" href="repair.html?service=Keyboard%20Repair"><span class="icon">keyboard</span>Keyboard Repair</a>
                  <a class="mega-item" href="repair.html?service=Battery%20Replacement"><span class="icon">battery_full</span>Battery Repair</a>
                  <a class="mega-item" href="repair.html?service=Charging%20Port%20Repair"><span class="icon">power</span>Charging Port Repair</a>
                  <a class="mega-item" href="repair.html?service=Motherboard%20Repair"><span class="icon">memory</span>Motherboard Repair</a>
                  <a class="mega-item" href="repair.html?service=Hard%20Drive%20Repair"><span class="icon">hard_disk</span>HDD / SSD Repair</a>
                  <a class="mega-item" href="repair.html?service=Data%20Recovery"><span class="icon">cloud_download</span>Data Recovery</a>
                  <a class="mega-item" href="repair.html?service=RAM%20Upgrade"><span class="icon">developer_board</span>RAM Upgrade</a>
                  <a class="mega-item" href="repair.html?service=SSD%20Upgrade"><span class="icon">hard_drive</span>SSD Upgrade</a>
                  <a class="mega-item" href="repair.html?service=Software%20Troubleshooting"><span class="icon">terminal</span>Software Repair</a>
                  <a class="mega-item" href="repair.html?service=LAN%20%2F%20Networking"><span class="icon">lan</span>Networking Support</a>
                </div>
              </div>

              <a class="nav-link" href="parts.html">Computer Parts</a>
              <a class="nav-link" href="contact.html?type=corporate">Corporate Bulk Deals</a>
              <a class="nav-link" href="track.html">Track Request</a>
              <a class="nav-link" href="contact.html">Contact</a>
            </nav>

            <a class="btn btn-green btn-small" href="https://wa.me/919654779949" target="_blank" rel="noopener">
              <span class="icon" style="font-size:16px;">chat</span> WhatsApp: +91 96547 79949
            </a>
          </div>
        </div>
      </header>

      <!-- Mobile Drawer Backdrop & Drawer Menu -->
      <div class="drawer-scrim"></div>
      <aside class="mobile-drawer" aria-hidden="true">
        <div class="mobile-drawer-head">
          <a class="logo" href="index.html">
            <img src="assets/images/bheral-logo.svg" alt="Bheral Systems Logo">
            <div class="logo-text">
              <strong>BHERAL SYSTEMS</strong>
              <small>Re-Commerce & Repair</small>
            </div>
          </a>
          <button class="icon-btn drawer-close" aria-label="Close navigation drawer">
            <span class="icon">close</span>
          </button>
        </div>
        <nav class="mobile-nav">
          <a href="index.html"><span class="icon">home</span> Home</a>
          <a href="buy.html"><span class="icon">shopping_bag</span> Buy Refurbished Laptops</a>
          <a href="sell.html"><span class="icon">currency_rupee</span> Sell Your Device</a>
          <a href="repair.html"><span class="icon">handyman</span> Book Computer Repair</a>
          <a href="parts.html"><span class="icon">memory</span> Computer Parts & SSD</a>
          <a href="contact.html?type=corporate"><span class="icon">business</span> Corporate Bulk Deals</a>
          <a href="wishlist.html"><span class="icon">favorite</span> Saved Wishlist</a>
          <a href="cart.html"><span class="icon">shopping_cart</span> Shopping Cart</a>
          <a href="track.html"><span class="icon">local_shipping</span> Track Any Request</a>
          <a href="contact.html"><span class="icon">support_agent</span> Contact & Store Info</a>
        </nav>
      </aside>
    `;
  }

  // Footer Component Generator
  function renderFooter() {
    const page = document.body.dataset.page || 'home';
    const whatsappMessages = {
      home: 'Hi Bheral Systems & Services, I would like to inquire about your laptops and computer services.',
      buy: 'Hi Bheral Systems & Services, I am interested in buying a refurbished laptop. Please share current available models.',
      product: 'Hi Bheral Systems & Services, I am interested in this product from your website. Please share availability.',
      sell: 'Hi Bheral Systems & Services, I want to sell my used laptop/computer device. Please guide me.',
      repair: 'Hi Bheral Systems & Services, I need to book computer repair / diagnostics with pickup.',
      parts: 'Hi Bheral Systems & Services, I need assistance with computer parts and upgrades.',
      contact: 'Hi Bheral Systems & Services, I have an inquiry.'
    };

    const msg = whatsappMessages[page] || whatsappMessages.home;
    const whatsappUrl = `https://wa.me/919654779949?text=${encodeURIComponent(msg)}`;

    return `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <div class="footer-brand-title">BHERAL SYSTEMS & SERVICES</div>
              <p>Delhi NCR's premier tech re-commerce, certified pre-owned IT infrastructure provider, and precision chip-level hardware repair laboratory.</p>
              <div class="footer-meta-item">
                <span class="icon">location_on</span>
                <span>Tech Zone, Nehru Place / NCR Central Hub, New Delhi, India</span>
              </div>
              <div class="footer-meta-item">
                <span class="icon">call</span>
                <a href="tel:+919654779949">+91 96547 79949</a>
              </div>
              <div class="footer-meta-item">
                <span class="icon">schedule</span>
                <span>Mon – Sat: 10:00 AM – 8:30 PM (Sunday Closed)</span>
              </div>
            </div>

            <!-- Col 1: BUY -->
            <div class="footer-col">
              <h4>Buy</h4>
              <ul>
                <li><a href="buy.html?category=Laptop">Refurbished Laptops</a></li>
                <li><a href="buy.html?category=Desktop">Custom Desktops</a></li>
                <li><a href="parts.html">Computer Parts</a></li>
                <li><a href="buy.html?category=Printer">Laser & Tank Printers</a></li>
                <li><a href="buy.html?category=Monitor">IPS & 4K Monitors</a></li>
              </ul>
            </div>

            <!-- Col 2: SELL -->
            <div class="footer-col">
              <h4>Sell</h4>
              <ul>
                <li><a href="sell.html?category=Laptop">Sell Laptop</a></li>
                <li><a href="sell.html?category=Desktop">Sell Desktop</a></li>
                <li><a href="sell.html?category=Printer">Sell Printer</a></li>
                <li><a href="sell.html?category=HDD">Sell Hard Disk & SSD</a></li>
                <li><a href="sell.html">Sell Computer Parts</a></li>
              </ul>
            </div>

            <!-- Col 3: REPAIR -->
            <div class="footer-col">
              <h4>Repair</h4>
              <ul>
                <li><a href="repair.html?service=Laptop%20Repair">Laptop Repair</a></li>
                <li><a href="repair.html?service=Desktop%20Repair">Desktop Repair</a></li>
                <li><a href="repair.html?service=Printer%20Repair">Printer Service</a></li>
                <li><a href="repair.html?service=Data%20Recovery">Data Recovery</a></li>
                <li><a href="repair.html?service=Motherboard%20Repair">Motherboard Chip-Level</a></li>
              </ul>
            </div>

            <!-- Col 4: SUPPORT & LEGAL -->
            <div class="footer-col">
              <h4>Support & Legal</h4>
              <ul>
                <li><a href="track.html">Track Service Request</a></li>
                <li><a href="warranty.html">Warranty Guidelines</a></li>
                <li><a href="warranty.html#pickup">Doorstep Pickup Policy</a></li>
                <li><a href="privacy.html">Privacy Policy</a></li>
                <li><a href="terms.html">Terms & Conditions</a></li>
              </ul>
            </div>
          </div>

          <div class="footer-bottom">
            <div>
              <span>© 2026 Bheral Systems & Services. All rights reserved.</span>
              <span style="margin: 0 0.5rem;">•</span>
              <span>Tested & Verified Tech Re-Commerce</span>
            </div>
            <div class="footer-chips-row">
              <span class="footer-chip">UPI / QR Accepted</span>
              <span class="footer-chip">Doorstep Pickup</span>
              <span class="footer-chip">GST Invoicing Available</span>
            </div>
          </div>
        </div>
      </footer>

      <!-- Floating WhatsApp CTA with live pulse -->
      <a class="whatsapp-float" href="${whatsappUrl}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp with Bheral Systems">
        <span class="whatsapp-pulse"></span>
        <span class="icon">chat</span>
        <span>WhatsApp Support</span>
      </a>

      <!-- Mobile Bottom Navigation Bar -->
      <nav class="mobile-bottom" aria-label="Mobile Bottom Navigation">
        <a href="index.html" class="${page === 'home' ? 'active' : ''}"><span class="icon">home</span>Home</a>
        <a href="buy.html" class="${page === 'buy' ? 'active' : ''}"><span class="icon">shopping_bag</span>Buy</a>
        <a href="sell.html" class="sell-center-btn" aria-label="Sell your device"><span class="icon">currency_rupee</span></a>
        <a href="repair.html" class="${page === 'repair' ? 'active' : ''}"><span class="icon">handyman</span>Repair</a>
        <a href="contact.html" class="${page === 'contact' ? 'active' : ''}"><span class="icon">person</span>Account</a>
      </nav>
    `;
  }

  // Shell mounting & event attachment
  function mountShell() {
    seedDemoRecords();

    const headerTarget = qs('#site-header');
    const footerTarget = qs('#site-footer');

    if (headerTarget) headerTarget.outerHTML = renderHeader();
    if (footerTarget) footerTarget.outerHTML = renderFooter();

    const page = document.body.dataset.page || 'home';
    qsa('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if ((page === 'home' && href === 'index.html') || (href && href.startsWith(page + '.html'))) {
        link.classList.add('active');
      }
    });

    bindMobileDrawer();
    bindGlobalClickDelegations();
    updateCounts();
  }

  // Mobile navigation drawer toggle
  function bindMobileDrawer() {
    const drawer = qs('.mobile-drawer');
    const scrim = qs('.drawer-scrim');

    const toggle = open => {
      drawer?.classList.toggle('open', open);
      scrim?.classList.toggle('open', open);
      drawer?.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('no-scroll', open);
    };

    qs('.mobile-trigger')?.addEventListener('click', () => toggle(true));
    qs('.drawer-close')?.addEventListener('click', () => toggle(false));
    scrim?.addEventListener('click', () => toggle(false));
  }

  // Global event delegation for buttons across all dynamic views
  function bindGlobalClickDelegations() {
    document.addEventListener('click', e => {
      // Add to cart button
      const addCartBtn = e.target.closest('[data-add-cart]');
      if (addCartBtn) {
        e.preventDefault();
        const id = addCartBtn.dataset.addCart;
        const qty = Number(addCartBtn.dataset.qty || 1);
        addCart(id, qty);
      }

      // Wishlist toggle button
      const wishBtn = e.target.closest('[data-wishlist]');
      if (wishBtn) {
        e.preventDefault();
        const id = wishBtn.dataset.wishlist;
        toggleWishlist(id);
      }

      // Accessible accordion toggle
      const accBtn = e.target.closest('.accordion > button');
      if (accBtn) {
        const box = accBtn.parentElement;
        const isOpen = box.classList.toggle('open');
        accBtn.setAttribute('aria-expanded', String(isOpen));
      }
    });
  }

  document.addEventListener('DOMContentLoaded', mountShell);

  return {
    keys,
    safeGet,
    save,
    money,
    escapeHTML,
    uniqueId,
    qs,
    qsa,
    toast,
    updateCounts,
    addCart,
    toggleWishlist,
    productById,
    productCard
  };
})();
