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
        <!-- Top Dark Utility Bar / Ticker -->
        <div class="utility">
          <div class="container">
            <div class="utility-left">
              <span class="utility-item"><span class="icon" style="font-size:15px;">location_on</span> Sector 11, Rohini, New Delhi 110085</span>
            </div>
            <div class="utility-center">
              <span class="utility-item"><span class="icon" style="font-size:16px;">local_shipping</span> Doorstep Pickup &amp; Delivery across Delhi NCR</span>
            </div>
            <div class="utility-right">
              <a href="tel:+919654779949" class="utility-item"><span class="icon" style="font-size:15px;">call</span> +91 96547 79949</a>
              <span class="utility-sep">|</span>
              <a href="track.html" class="utility-item">Track Order</a>
              <span class="utility-sep">|</span>
              <a href="contact.html" class="utility-item">Help Center</a>
            </div>
          </div>
        </div>

        <!-- Main Header Row -->
        <div class="container header-main">
          <button class="icon-btn mobile-trigger" aria-label="Open mobile menu">
            <span class="icon" style="font-size:26px;">menu</span>
          </button>

          <a class="logo" href="index.html">
            <div class="logo-icon-wrap">
              <svg width="34" height="28" viewBox="0 0 32 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="2" width="26" height="18" rx="2" stroke="#111827" stroke-width="2.5"/>
                <rect x="6" y="5" width="20" height="12" fill="#EBF3FF"/>
                <path d="M1 22C1 20.8954 1.89543 20 3 20H29C30.1046 20 31 20.8954 31 22V23C31 23.5523 30.5523 24 30 24H2C1.44772 24 1 23.5523 1 23V22Z" fill="#111827"/>
                <path d="M12 21H20" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="logo-text">
              <span class="brand-title">BHERAL SYSTEM <span class="text-primary">&amp; SERVICES</span></span>
              <small class="brand-sub">Tech Re-Commerce &amp; Repair</small>
            </div>
          </a>

          <!-- Global Searchbar -->
          <div class="search-wrap">
            <div class="searchbar">
              <input id="global-search" type="search" placeholder="Search laptops, brands, categories..." autocomplete="off" aria-label="Search site products and services">
              <div class="search-category-wrap">
                <select class="search-category-select" id="search-cat-scope" aria-label="Filter search category">
                  <option value="all">All Categories</option>
                  <option value="Ultrabook">Ultrabooks</option>
                  <option value="Gaming">Gaming Laptops</option>
                  <option value="Business">Business Laptops</option>
                  <option value="2in1">2-in-1 Laptops</option>
                  <option value="Student">Student Laptops</option>
                  <option value="Workstation">Workstations</option>
                  <option value="Parts">Computer Parts</option>
                  <option value="Repair">Repairs</option>
                </select>
              </div>
              <button id="global-search-btn" type="button" aria-label="Execute search">
                <span class="icon">search</span>
              </button>
            </div>
            <div class="suggestions" id="search-suggestions" role="listbox" aria-label="Search suggestions"></div>
          </div>

          <!-- Header Actions -->
          <div class="header-actions">
            <a class="header-action-item" href="buy.html?view=compare" title="Compare devices">
              <div class="action-icon-wrap">
                <span class="icon">swap_horiz</span>
              </div>
              <span class="action-label">Compare</span>
            </a>
            <a class="header-action-item wishlist-link" href="wishlist.html" title="View wishlist">
              <div class="action-icon-wrap">
                <span class="icon">favorite_border</span>
                <span class="count wishlist-count">0</span>
              </div>
              <span class="action-label">Wishlist</span>
            </a>
            <a class="header-action-item" href="cart.html" title="View cart">
              <div class="action-icon-wrap">
                <span class="icon">shopping_cart</span>
                <span class="count cart-count">0</span>
              </div>
              <span class="action-label">Cart</span>
            </a>
            <a class="header-action-item" href="contact.html?action=signin" title="Sign In">
              <div class="action-icon-wrap">
                <span class="icon">person_outline</span>
              </div>
              <span class="action-label">Sign In</span>
            </a>
          </div>
        </div>

        <!-- Subnavigation Row -->
        <div class="nav-row">
          <div class="container">
            <div class="nav-row-inner">
              <!-- Dark SHOP BY CATEGORY Button with dropdown -->
              <div class="shop-category-wrapper">
                <button class="btn-shop-category" id="btn-shop-category" aria-expanded="false" type="button">
                  <span class="icon">menu</span>
                  <span>SHOP BY CATEGORY</span>
                </button>
                <div class="shop-category-dropdown" id="shop-category-dropdown">
                  <a href="buy.html?category=Ultrabook" class="cat-drop-item"><span class="icon">laptop_mac</span> Ultrabooks</a>
                  <a href="buy.html?category=Gaming" class="cat-drop-item"><span class="icon">sports_esports</span> Gaming Laptops</a>
                  <a href="buy.html?category=Business" class="cat-drop-item"><span class="icon">business_center</span> Business Laptops</a>
                  <a href="buy.html?category=2in1" class="cat-drop-item"><span class="icon">screen_rotation</span> 2-in-1 Laptops</a>
                  <a href="buy.html?category=Student" class="cat-drop-item"><span class="icon">school</span> Student Laptops</a>
                  <a href="buy.html?category=Workstation" class="cat-drop-item"><span class="icon">desktop_windows</span> Workstations</a>
                  <div class="dropdown-divider"></div>
                  <a href="parts.html" class="cat-drop-item"><span class="icon">memory</span> Computer Parts</a>
                  <a href="repair.html" class="cat-drop-item"><span class="icon">handyman</span> Repair Services</a>
                </div>
              </div>

              <!-- Main Desktop Nav Links -->
              <nav class="desktop-nav" aria-label="Main Store Navigation">
                <a class="nav-link active" href="index.html">HOME</a>

                <!-- LAPTOPS Mega Menu -->
                <div class="nav-item">
                  <a class="nav-link" href="buy.html">LAPTOPS <span class="icon nav-chevron">expand_more</span></a>
                  <div class="mega-menu">
                    <a class="mega-item" href="buy.html?category=Ultrabook"><span class="icon">laptop</span>Ultrabooks</a>
                    <a class="mega-item" href="buy.html?category=Gaming"><span class="icon">sports_esports</span>Gaming Laptops</a>
                    <a class="mega-item" href="buy.html?category=Business"><span class="icon">business_center</span>Business Laptops</a>
                    <a class="mega-item" href="buy.html?category=2in1"><span class="icon">screen_rotation</span>2-in-1 Laptops</a>
                    <a class="mega-item" href="buy.html?category=Student"><span class="icon">school</span>Student Laptops</a>
                    <a class="mega-item" href="buy.html"><span class="icon">verified</span>All Laptops</a>
                  </div>
                </div>

                <!-- BRANDS Mega Menu -->
                <div class="nav-item">
                  <a class="nav-link" href="buy.html">BRANDS <span class="icon nav-chevron">expand_more</span></a>
                  <div class="mega-menu">
                    <a class="mega-item" href="buy.html?brand=Apple"><img src="assets/images/brands/apple.svg" alt="Apple" style="height:20px;width:auto;margin-right:10px;vertical-align:middle;object-fit:contain;"> Apple</a>
                    <a class="mega-item" href="buy.html?brand=Lenovo"><img src="assets/images/brands/lenovo.svg" alt="Lenovo" style="height:16px;width:auto;margin-right:10px;vertical-align:middle;object-fit:contain;"> Lenovo ThinkPad</a>
                    <a class="mega-item" href="buy.html?brand=Dell"><img src="assets/images/brands/dell.svg" alt="Dell" style="height:20px;width:auto;margin-right:10px;vertical-align:middle;object-fit:contain;"> Dell Latitude & XPS</a>
                    <a class="mega-item" href="buy.html?brand=HP"><img src="assets/images/brands/hp.svg" alt="HP" style="height:20px;width:auto;margin-right:10px;vertical-align:middle;object-fit:contain;"> HP EliteBook</a>
                    <a class="mega-item" href="buy.html?brand=ASUS"><img src="assets/images/brands/asus.svg" alt="ASUS" style="height:14px;width:auto;margin-right:10px;vertical-align:middle;object-fit:contain;"> ASUS ROG</a>
                    <a class="mega-item" href="buy.html?brand=Acer"><img src="assets/images/brands/acer.svg" alt="Acer" style="height:16px;width:auto;margin-right:10px;vertical-align:middle;object-fit:contain;"> Acer</a>
                    <a class="mega-item" href="buy.html?brand=MSI"><img src="assets/images/brands/msi.svg" alt="MSI" style="height:15px;width:auto;margin-right:10px;vertical-align:middle;object-fit:contain;"> MSI Gaming</a>
                    <a class="mega-item" href="buy.html?brand=Samsung"><img src="assets/images/brands/samsung.svg" alt="Samsung" style="height:14px;width:auto;margin-right:10px;vertical-align:middle;object-fit:contain;"> Samsung Galaxy Book</a>
                  </div>
                </div>

                <!-- ACCESSORIES Mega Menu -->
                <div class="nav-item">
                  <a class="nav-link" href="parts.html">ACCESSORIES <span class="icon nav-chevron">expand_more</span></a>
                  <div class="mega-menu">
                    <a class="mega-item" href="parts.html?cat=Charger"><span class="icon">power</span>Chargers & Adapters</a>
                    <a class="mega-item" href="parts.html?cat=RAM"><span class="icon">developer_board</span>RAM Memory</a>
                    <a class="mega-item" href="parts.html?cat=SSD"><span class="icon">hard_drive</span>SSDs</a>
                    <a class="mega-item" href="parts.html?cat=Battery"><span class="icon">battery_full</span>Batteries</a>
                    <a class="mega-item" href="parts.html"><span class="icon">extension</span>All Accessories</a>
                  </div>
                </div>

                <a class="nav-link" href="buy.html?filter=deals">DEALS</a>
                <a class="nav-link" href="contact.html?type=corporate">BUSINESS STORE</a>
                <a class="nav-link" href="warranty.html">ABOUT US</a>
                <a class="nav-link" href="contact.html">CONTACT US</a>
              </nav>
            </div>
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
              <strong>BHERAL SYSTEM &amp; SERVICES</strong>
              <small>Tech Re-Commerce &amp; Repair</small>
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
              <div class="footer-brand-title">BHERAL SYSTEM &amp; SERVICES</div>
              <p>Delhi NCR's premier tech re-commerce, certified pre-owned IT infrastructure provider, and precision chip-level hardware repair laboratory.</p>
              <div class="footer-meta-item">
                <span class="icon">location_on</span>
                <span>1st Floor, Landmark Veera Devi Jain Charitable Trust Hospital, D-3/6, Pocket 3, Sector 11, Rohini, New Delhi, Delhi 110085</span>
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

      // Shop by Category toggle button
      const shopCatBtn = e.target.closest('#btn-shop-category');
      const shopCatWrap = e.target.closest('.shop-category-wrapper');
      if (shopCatBtn) {
        e.preventDefault();
        const wrap = shopCatBtn.closest('.shop-category-wrapper');
        const isOpen = wrap.classList.toggle('open');
        shopCatBtn.setAttribute('aria-expanded', String(isOpen));
      } else if (!shopCatWrap) {
        qs('.shop-category-wrapper')?.classList.remove('open');
        qs('#btn-shop-category')?.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function enforceAccessGate() {
    const isAuth = localStorage.getItem('bss_access_unlocked') === 'true' ||
                   sessionStorage.getItem('bss_access_unlocked') === 'true';
    if (isAuth) return;

    const gate = document.createElement('div');
    gate.id = 'bss-access-gate-overlay';
    gate.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:radial-gradient(ellipse at 50% -20%, #1e293b 0%, #090d16 60%, #030712 100%);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Poppins,sans-serif;box-sizing:border-box;';

    gate.innerHTML = `
      <div style="position:relative;width:100%;max-width:440px;background:rgba(15,23,42,0.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:36px 30px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.8), 0 0 40px -10px rgba(14,165,233,0.25);color:#fff;text-align:center;box-sizing:border-box;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,rgba(14,165,233,0.2) 0%,rgba(99,102,241,0.2) 100%);border:1px solid rgba(14,165,233,0.3);margin-bottom:16px;">
          <span class="material-symbols-outlined" style="font-size:32px;color:#38bdf8;">lock</span>
        </div>
        <div style="display:inline-block;padding:4px 12px;border-radius:999px;background:rgba(14,165,233,0.12);border:1px solid rgba(14,165,233,0.3);font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#38bdf8;margin-bottom:12px;">
          Protected Portal Gateway
        </div>
        <h2 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#fff;">Bheral Systems & Services</h2>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 24px;line-height:1.4;">Enter authorized credentials to view the website.</p>
        <div id="bss-gate-err" style="display:none;padding:10px 14px;border-radius:10px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#fca5a5;font-size:13px;margin-bottom:18px;text-align:left;"></div>
        <form id="bss-gate-form" style="display:flex;flex-direction:column;gap:16px;text-align:left;">
          <div>
            <label style="display:block;font-size:12px;font-weight:500;color:#cbd5e1;margin-bottom:6px;">User ID / Username</label>
            <input id="bss-gate-user" type="text" autocomplete="username" placeholder="e.g. peculiex" required style="width:100%;height:46px;padding:0 14px;border-radius:10px;background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:14px;outline:none;box-sizing:border-box;">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:500;color:#cbd5e1;margin-bottom:6px;">Password</label>
            <input id="bss-gate-pass" type="password" autocomplete="current-password" placeholder="Enter password" required style="width:100%;height:46px;padding:0 14px;border-radius:10px;background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:14px;outline:none;box-sizing:border-box;">
          </div>
          <button type="submit" style="margin-top:8px;height:48px;width:100%;border-radius:10px;background:linear-gradient(135deg,#0284c7 0%,#2563eb 50%,#4f46e5 100%);border:none;color:#fff;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 8px 20px -4px rgba(37,99,235,0.5);">
            Enter Website &rarr;
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(gate);
    document.body.style.overflow = 'hidden';

    const form = document.getElementById('bss-gate-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('bss-gate-user').value.trim().toLowerCase();
        const p = document.getElementById('bss-gate-pass').value;
        const err = document.getElementById('bss-gate-err');

        if (u === 'peculiex' && p === 'Peculiex@2026') {
          localStorage.setItem('bss_access_unlocked', 'true');
          sessionStorage.setItem('bss_access_unlocked', 'true');
          gate.style.opacity = '0';
          gate.style.transition = 'opacity 0.3s ease';
          setTimeout(() => {
            gate.remove();
            document.body.style.overflow = '';
          }, 300);
        } else {
          err.textContent = 'Invalid User ID or Password. Access denied.';
          err.style.display = 'block';
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    mountShell();
    enforceAccessGate();
  });

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
