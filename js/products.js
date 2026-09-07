/**
 * BHERAL SYSTEMS & SERVICES - PRODUCT LISTING & DETAIL CONTROLLER
 * Handles multi-facet filtering, sorting, pagination, filter drawer,
 * and the dynamic product detail view (gallery, specifications, tabs, pincode check).
 */
(() => {
  'use strict';

  const { products } = window.BSS_DATA;
  const { money, escapeHTML, productCard, productById, addCart, toggleWishlist, safeGet, keys } = window.BSS;

  const getParams = () => new URLSearchParams(window.location.search);

  // --------------------------------------------------------------------------
  // PRODUCT LISTING VIEW (buy.html & parts.html)
  // --------------------------------------------------------------------------
  function initProductListing() {
    const listingEl = document.getElementById('product-listing-grid');
    if (!listingEl) return;

    const isPartsOnly = document.body.dataset.page === 'parts';
    const params = getParams();
    const searchQuery = params.get('q') || '';
    const initialCategory = params.get('category') || '';

    // Allowed base products
    const baseProducts = isPartsOnly
      ? products.filter(p => !['Laptop', 'Desktop'].includes(p.category))
      : products;

    // Elements
    const filterForm = document.getElementById('filters-form');
    const sortSelect = document.getElementById('sort-select');
    const priceRange = document.getElementById('price-slider');
    const priceDisplay = document.getElementById('price-slider-val');
    const resultCountEl = document.getElementById('result-count');
    const activeFiltersEl = document.getElementById('active-filter-chips');
    const clearBtn = document.getElementById('clear-filters-btn');
    const emptyStateEl = document.getElementById('empty-state');
    const emptyClearBtn = document.getElementById('empty-clear-btn');
    const mobileFilterTrigger = document.getElementById('mobile-filter-trigger');
    const mobileFilterClose = document.getElementById('mobile-filter-close');
    const mobileFilterApply = document.getElementById('mobile-filter-apply');
    const filterSidebar = document.getElementById('filter-sidebar');
    const loadMoreBtn = document.getElementById('load-more-btn');

    let itemsPerPage = 8;
    let currentPage = 1;

    // Pre-select category checkbox if in URL
    if (initialCategory && filterForm) {
      const targetCheckbox = filterForm.querySelector(`input[name="category"][value="${CSS.escape(initialCategory)}"]`);
      if (targetCheckbox) targetCheckbox.checked = true;
    }

    // Filter and sort execution
    function applyFiltersAndRender() {
      const checkedCategories = [...document.querySelectorAll('input[name="category"]:checked')].map(el => el.value);
      const checkedBrands = [...document.querySelectorAll('input[name="brand"]:checked')].map(el => el.value);
      const checkedProcessors = [...document.querySelectorAll('input[name="processor"]:checked')].map(el => el.value);
      const checkedRam = [...document.querySelectorAll('input[name="ram"]:checked')].map(el => Number(el.value));
      const checkedStorage = [...document.querySelectorAll('input[name="storage"]:checked')].map(el => Number(el.value));
      const checkedStorageType = [...document.querySelectorAll('input[name="storageType"]:checked')].map(el => el.value);
      const checkedScreenSize = [...document.querySelectorAll('input[name="screenSize"]:checked')].map(el => Number(el.value));
      const checkedGpu = [...document.querySelectorAll('input[name="gpu"]:checked')].map(el => el.value);
      const checkedOS = [...document.querySelectorAll('input[name="os"]:checked')].map(el => el.value);
      const checkedCondition = [...document.querySelectorAll('input[name="condition"]:checked')].map(el => el.value);
      const checkedRating = [...document.querySelectorAll('input[name="rating"]:checked')].map(el => Number(el.value));
      const inStockOnly = document.querySelector('input[name="availability"]')?.checked;
      const maxPrice = priceRange ? Number(priceRange.value) : 100000;

      let filtered = baseProducts.filter(p => {
        // Query search
        if (searchQuery) {
          const combinedText = `${p.name} ${p.brand} ${p.category} ${p.processor} ${p.description}`.toLowerCase();
          if (!combinedText.includes(searchQuery.toLowerCase())) return false;
        }

        // Category filter
        if (checkedCategories.length && !checkedCategories.includes(p.category)) return false;

        // Brand filter
        if (checkedBrands.length && !checkedBrands.includes(p.brand)) return false;

        // Processor filter
        if (checkedProcessors.length && !checkedProcessors.some(proc => p.processor.includes(proc))) return false;

        // RAM filter
        if (checkedRam.length && !checkedRam.includes(p.ram)) return false;

        // Storage filter
        if (checkedStorage.length && !checkedStorage.includes(p.storage)) return false;

        // Storage Type filter
        if (checkedStorageType.length && !checkedStorageType.includes(p.storageType)) return false;

        // Screen Size filter
        if (checkedScreenSize.length && !checkedScreenSize.includes(p.screenSize)) return false;

        // GPU filter (Integrated vs Dedicated)
        if (checkedGpu.length) {
          const isDedicated = /NVIDIA|Quadro|GTX|RTX|Radeon/i.test(p.gpu);
          if (checkedGpu.includes('Dedicated') && !isDedicated) return false;
          if (checkedGpu.includes('Integrated') && isDedicated) return false;
        }

        // OS filter
        if (checkedOS.length && !checkedOS.includes(p.operatingSystem)) return false;

        // Condition filter
        if (checkedCondition.length && !checkedCondition.includes(p.condition)) return false;

        // Rating filter
        if (checkedRating.length && !checkedRating.some(r => p.rating >= r)) return false;

        // Availability filter
        if (inStockOnly && p.stock <= 0) return false;

        // Price limit
        if (p.price > maxPrice) return false;

        return true;
      });

      // Sorting
      const sortMode = sortSelect ? sortSelect.value : 'recommended';
      filtered.sort((a, b) => {
        switch (sortMode) {
          case 'low': return a.price - b.price;
          case 'high': return b.price - a.price;
          case 'rating': return b.rating - a.rating;
          case 'discount': return (b.discount || 0) - (a.discount || 0);
          case 'newest': return Number(b.isNew || 0) - Number(a.isNew || 0);
          default: return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.reviewCount - a.reviewCount;
        }
      });

      // Update Result Count
      if (resultCountEl) {
        resultCountEl.textContent = `${filtered.length} product${filtered.length === 1 ? '' : 's'} available`;
      }

      // Render Active Chips
      if (activeFiltersEl) {
        const chips = [];
        if (searchQuery) chips.push(`Search: "${searchQuery}"`);
        checkedCategories.forEach(c => chips.push(`Category: ${c}`));
        checkedBrands.forEach(b => chips.push(`Brand: ${b}`));
        checkedProcessors.forEach(pr => chips.push(`CPU: ${pr}`));
        checkedRam.forEach(r => chips.push(`RAM: ${r}GB`));
        checkedStorage.forEach(s => chips.push(`Storage: ${s}GB`));
        checkedCondition.forEach(cd => chips.push(`Condition: ${cd}`));
        if (maxPrice < 90000) chips.push(`Max: ${money(maxPrice)}`);
        if (inStockOnly) chips.push('In Stock Only');

        activeFiltersEl.innerHTML = chips.map(chip => `
          <span class="filter-chip">
            <span>${escapeHTML(chip)}</span>
            <span class="icon" style="font-size:14px;margin-left:2px;">close</span>
          </span>
        `).join('');

        // Clicking a chip clears filters
        activeFiltersEl.querySelectorAll('.filter-chip').forEach(chip => {
          chip.addEventListener('click', clearAllFilters);
        });
      }

      // Pagination slice
      const displayed = filtered.slice(0, currentPage * itemsPerPage);

      // Render Products
      if (displayed.length) {
        listingEl.innerHTML = displayed.map(productCard).join('');
        listingEl.classList.remove('hidden');
        if (emptyStateEl) emptyStateEl.classList.add('hidden');
      } else {
        listingEl.innerHTML = '';
        listingEl.classList.add('hidden');
        if (emptyStateEl) emptyStateEl.classList.remove('hidden');
      }

      // Load More Button state
      if (loadMoreBtn) {
        loadMoreBtn.classList.toggle('hidden', displayed.length >= filtered.length);
      }

      // Update Price Slider Label
      if (priceDisplay && priceRange) {
        priceDisplay.textContent = `Up to ${money(priceRange.value)}`;
      }
    }

    function clearAllFilters() {
      if (filterForm) filterForm.reset();
      if (priceRange) priceRange.value = 90000;
      window.history.replaceState({}, '', window.location.pathname);
      currentPage = 1;
      applyFiltersAndRender();
    }

    // Event Listeners
    if (filterForm) filterForm.addEventListener('change', () => { currentPage = 1; applyFiltersAndRender(); });
    if (sortSelect) sortSelect.addEventListener('change', () => { currentPage = 1; applyFiltersAndRender(); });
    if (priceRange) priceRange.addEventListener('input', applyFiltersAndRender);
    if (clearBtn) clearBtn.addEventListener('click', clearAllFilters);
    if (emptyClearBtn) emptyClearBtn.addEventListener('click', clearAllFilters);

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        applyFiltersAndRender();
      });
    }

    // Mobile Drawer Handlers
    if (mobileFilterTrigger && filterSidebar) {
      mobileFilterTrigger.addEventListener('click', () => {
        filterSidebar.classList.add('open');
      });
    }

    if (mobileFilterClose && filterSidebar) {
      mobileFilterClose.addEventListener('click', () => {
        filterSidebar.classList.remove('open');
      });
    }

    if (mobileFilterApply && filterSidebar) {
      mobileFilterApply.addEventListener('click', () => {
        filterSidebar.classList.remove('open');
        applyFiltersAndRender();
      });
    }

    // Initial render
    applyFiltersAndRender();
  }

  // --------------------------------------------------------------------------
  // PRODUCT DETAIL VIEW (product.html?id=...)
  // --------------------------------------------------------------------------
  function initProductDetail() {
    const detailContainer = document.getElementById('product-detail-app');
    if (!detailContainer) return;

    const params = getParams();
    const productId = params.get('id');
    const product = productById(productId) || products[0];

    const isWished = safeGet(keys.wishlist).includes(product.id);
    const relatedProducts = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

    detailContainer.innerHTML = `
      <!-- Breadcrumbs & Hero -->
      <section class="page-hero">
        <div class="container">
          <div class="breadcrumbs">
            <a href="index.html">Home</a>
            <span>/</span>
            <a href="buy.html">Buy Refurbished</a>
            <span>/</span>
            <span style="color:var(--on-surface);">${escapeHTML(product.name)}</span>
          </div>
          <h1>${escapeHTML(product.name)}</h1>
          <p>${escapeHTML(product.description)}</p>
        </div>
      </section>

      <!-- Main Product Stage -->
      <section class="section">
        <div class="container">
          <div class="detail-grid">
            <!-- Left: Gallery -->
            <div class="detail-gallery">
              <div class="gallery-stage">
                <img id="main-product-img" src="${product.image}" alt="${escapeHTML(product.name)}">
              </div>
              <div class="gallery-thumbs" id="gallery-thumbs">
                ${(product.images || [product.image]).map((img, idx) => `
                  <button class="gallery-thumb ${idx === 0 ? 'active' : ''}" data-src="${img}" aria-label="View product image ${idx + 1}">
                    <img src="${img}" alt="Thumbnail ${idx + 1}">
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Right: Product Info & Actions -->
            <div class="product-info-panel">
              <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
                <span class="badge badge-green"><span class="icon" style="font-size:14px;">verified</span> 50-Point Audit Passed</span>
                <span class="badge badge-blue"><span class="icon" style="font-size:14px;">verified_user</span> ${escapeHTML(product.condition)} Condition</span>
                <span class="badge badge-amber"><span class="icon" style="font-size:14px;">shield</span> ${escapeHTML(product.warranty)}</span>
              </div>

              <h1>${escapeHTML(product.name)}</h1>

              <div class="rating-row" style="font-size:14px;margin-bottom:1rem;">
                <span class="icon" style="color:var(--amber);">star</span>
                <strong>${product.rating}</strong>
                <span class="muted">(${product.reviewCount} customer reviews)</span>
                <span style="opacity:0.4;">•</span>
                <span style="color:var(--emerald-text);font-weight:600;">Verified Nehru Place Stock</span>
              </div>

              <div class="price-box" style="margin-bottom:1.5rem;">
                <span class="price" style="font-size:2.2rem;color:var(--primary);">${money(product.price)}</span>
                ${product.originalPrice ? `<span class="old-price" style="font-size:1.1rem;">${money(product.originalPrice)}</span>` : ''}
                ${product.discount ? `<span class="discount" style="font-size:1.1rem;">${product.discount}% OFF</span>` : ''}
              </div>

              <!-- Quick Spec Highlights -->
              <div class="specs-summary-grid">
                <div class="spec-summary-item">
                  <small>Processor</small>
                  <strong>${escapeHTML(product.processor || 'Enterprise Standard')}</strong>
                </div>
                <div class="spec-summary-item">
                  <small>Installed Memory</small>
                  <strong>${product.ram ? `${product.ram}GB RAM` : 'OEM Specified'}</strong>
                </div>
                <div class="spec-summary-item">
                  <small>Storage Drive</small>
                  <strong>${product.storage ? `${product.storage}GB ${product.storageType || 'SSD'}` : 'High Speed Storage'}</strong>
                </div>
                <div class="spec-summary-item">
                  <small>Operating System</small>
                  <strong>${escapeHTML(product.operatingSystem || 'Windows 11 Genuine')}</strong>
                </div>
              </div>

              <!-- Quantity Selector & Stock -->
              <div class="qty-selector-row">
                <span style="font-weight:700;font-size:13.5px;">Quantity</span>
                <div class="qty-control">
                  <button id="qty-minus-btn" aria-label="Decrease quantity">−</button>
                  <span id="qty-display">1</span>
                  <button id="qty-plus-btn" aria-label="Increase quantity">+</button>
                </div>
                <span class="badge ${product.stock > 0 ? 'badge-green' : 'badge-amber'}">
                  ${product.stock > 0 ? `${product.stock} units available` : 'Low Stock'}
                </span>
              </div>

              <!-- Core CTAs -->
              <div class="detail-actions-grid">
                <button class="btn btn-primary btn-lg" id="detail-add-cart-btn">
                  <span class="icon">shopping_bag</span> Add to Cart
                </button>
                <button class="btn btn-green btn-lg" id="detail-buy-now-btn">
                  <span class="icon">flash_on</span> Buy Now
                </button>
              </div>

              <div style="display:flex;gap:0.75rem;margin-bottom:1.5rem;">
                <button class="btn btn-secondary" id="detail-wishlist-btn" style="flex:1;">
                  <span class="icon" style="${isWished ? 'color:#e11d48;' : ''}">favorite</span>
                  <span>${isWished ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
                </button>
                <a class="btn btn-secondary" style="flex:1;" href="https://wa.me/919654779949?text=${encodeURIComponent(`Hi Bheral Systems & Services, I am interested in ${product.name} priced at ${money(product.price)}. Please share availability and current photos.`)}" target="_blank" rel="noopener">
                  <span class="icon" style="color:#007d55;">chat</span> WhatsApp Enquiry
                </a>
              </div>

              <!-- Delhi Pincode Eligibility Checker -->
              <div class="pincode-card">
                <div style="display:flex;align-items:center;gap:0.5rem;font-weight:700;font-size:13px;">
                  <span class="icon" style="color:var(--primary);">local_shipping</span>
                  <span>Check Delhi NCR Doorstep Delivery & Pickup Eligibility</span>
                </div>
                <div class="pincode-input-row">
                  <input id="pincode-input" type="text" maxlength="6" inputmode="numeric" placeholder="Enter 6-digit Pincode (e.g. 110019)">
                  <button class="btn btn-secondary" id="pincode-check-btn" type="button">Verify</button>
                </div>
                <small id="pincode-feedback" style="display:block;margin-top:0.5rem;color:var(--on-surface-variant);font-size:12px;">
                  Standard delivery available across India. Same-day pickup & delivery supported in Delhi NCR.
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 7 In-Depth Content Tabs -->
      <section class="section" style="background-color:var(--surface-container-low);">
        <div class="container">
          <div class="tab-navigation" role="tablist">
            <button class="tab-btn active" data-tab-target="tab-overview" role="tab">Overview</button>
            <button class="tab-btn" data-tab-target="tab-specifications" role="tab">Specifications</button>
            <button class="tab-btn" data-tab-target="tab-condition" role="tab">Condition Report</button>
            <button class="tab-btn" data-tab-target="tab-qc" role="tab">50-Point Quality Check</button>
            <button class="tab-btn" data-tab-target="tab-warranty" role="tab">Warranty</button>
            <button class="tab-btn" data-tab-target="tab-delivery" role="tab">Delivery & Pickup</button>
            <button class="tab-btn" data-tab-target="tab-faq" role="tab">FAQ</button>
          </div>

          <!-- Tab 1: Overview -->
          <div class="tab-content-panel active" id="tab-overview" role="tabpanel">
            <h2>Tested Corporate Reliability</h2>
            <p style="font-size:15px;line-height:1.7;color:var(--on-surface-variant);margin-bottom:1.5rem;">
              ${escapeHTML(product.description)}
            </p>
            <p style="font-size:14px;line-height:1.6;color:var(--on-surface-variant);">
              All laptops and hardware procured by Bheral Systems undergo strict clean-room servicing at our Delhi testing lab. Thermal paste is freshly replaced with Arctic MX-4, cooling fans are ultrasonic cleaned, and BIOS firmware is updated to official OEM releases to ensure uninterrupted performance for students, software engineers, and corporate teams.
            </p>
          </div>

          <!-- Tab 2: Specifications Table -->
          <div class="tab-content-panel" id="tab-specifications" role="tabpanel">
            <h2>Technical Specifications</h2>
            <table class="spec-table">
              ${Object.entries(product.specifications || {}).map(([key, val]) => `
                <tr>
                  <td>${escapeHTML(key)}</td>
                  <td><strong>${escapeHTML(val)}</strong></td>
                </tr>
              `).join('')}
            </table>
          </div>

          <!-- Tab 3: Condition Report -->
          <div class="tab-content-panel" id="tab-condition" role="tabpanel">
            <h2>Physical & Cosmetic Condition Summary</h2>
            <div style="display:flex;gap:1rem;margin-bottom:1.5rem;align-items:center;">
              <span class="badge badge-green" style="font-size:13px;padding:0.4rem 1rem;">${escapeHTML(product.condition)} Grade Condition</span>
              <span style="font-size:13px;color:var(--on-surface-variant);">Zero screen blemishes, zero dead pixels.</span>
            </div>
            <p style="line-height:1.7;color:var(--on-surface-variant);font-size:14px;">
              This unit has been categorized under our certified <strong>Grade ${escapeHTML(product.condition)}</strong> standard. Minimal superficial hairline marks may be visible on the outer casing from previous corporate deployment, but the internal hardware, display panel, keyboard, and hinges are in pristine operational health.
            </p>
          </div>

          <!-- Tab 4: 50-Point Quality Check -->
          <div class="tab-content-panel" id="tab-qc" role="tabpanel">
            <h2>50-Point Diagnostic Checkpoints</h2>
            <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">
              Before listing for dispatch, our hardware engineering team in Nehru Place certifies every device through a strict 50-point diagnostic audit:
            </p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
              <div style="background:var(--surface-container-low);padding:1rem;border-radius:var(--radius-md);">
                <strong style="color:var(--primary);display:block;margin-bottom:0.35rem;">1. Core Compute & Memory</strong>
                <span style="font-size:12px;color:var(--on-surface-variant);">CPU stress test, MemTest86 zero errors, GPU FurMark 15-min loop.</span>
              </div>
              <div style="background:var(--surface-container-low);padding:1rem;border-radius:var(--radius-md);">
                <strong style="color:var(--emerald-text);display:block;margin-bottom:0.35rem;">2. Display & Optical</strong>
                <span style="font-size:12px;color:var(--on-surface-variant);">Full RGB solid color screen test, backlight bleed check, hinge torque test.</span>
              </div>
              <div style="background:var(--surface-container-low);padding:1rem;border-radius:var(--radius-md);">
                <strong style="color:var(--secondary);display:block;margin-bottom:0.35rem;">3. Battery & Power Delivery</strong>
                <span style="font-size:12px;color:var(--on-surface-variant);">Battery wear cycle verification (&gt;80% capacity), charging jack stability.</span>
              </div>
            </div>
          </div>

          <!-- Tab 5: Warranty -->
          <div class="tab-content-panel" id="tab-warranty" role="tabpanel">
            <h2>${escapeHTML(product.warranty)}</h2>
            <p style="line-height:1.7;color:var(--on-surface-variant);font-size:14px;">
              Every refurbished laptop includes our written <strong>6-Month Replacement & Repair Guarantee</strong>. In the unlikely event of any motherboard, display, or hardware failure under normal usage within the warranty period, we provide doorstep pickup, prompt repair, or equivalent model replacement.
            </p>
          </div>

          <!-- Tab 6: Delivery & Pickup -->
          <div class="tab-content-panel" id="tab-delivery" role="tabpanel">
            <h2>Doorstep Delivery & Store Pickup</h2>
            <p style="line-height:1.7;color:var(--on-surface-variant);font-size:14px;">
              - <strong>Delhi NCR Express</strong>: Orders confirmed before 2:00 PM qualify for same-day delivery across Delhi, Noida, and Gurugram.<br>
              - <strong>Pan-India Insured Shipping</strong>: Safe air dispatch via Blue Dart & DTDC with full transit insurance (2–4 days).<br>
              - <strong>Nehru Place Store Collection</strong>: In-person hands-on verification and pickup available at our central lab.
            </p>
          </div>

          <!-- Tab 7: FAQ -->
          <div class="tab-content-panel" id="tab-faq" role="tabpanel">
            <h2>Frequently Asked Questions</h2>
            <div class="accordion">
              <button>Can I upgrade the RAM or SSD before delivery?<span class="icon">expand_more</span></button>
              <div class="accordion-panel">Yes! Our technicians can install additional RAM or a 1TB/2TB NVMe SSD prior to dispatch with warranty intact. Contact our team via WhatsApp for instant upgrade quotes.</div>
            </div>
            <div class="accordion">
              <button>What accessories come in the box?<span class="icon">expand_more</span></button>
              <div class="accordion-panel">You will receive the laptop safely packaged in high-density protective foam, the genuine original OEM charger, a certified power cable, and your written GST invoice with warranty seal.</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Related Products Recommendations -->
      <section class="section">
        <div class="container">
          <div class="section-head">
            <div>
              <span class="eyebrow green">Similar Alternatives</span>
              <h2>Related Certified Hardware</h2>
            </div>
            <a class="text-link" href="buy.html?category=${encodeURIComponent(product.category)}">View all in ${escapeHTML(product.category)} →</a>
          </div>
          <div class="product-grid">
            ${relatedProducts.map(productCard).join('')}
          </div>
        </div>
      </section>
    `;

    // Bind Gallery Thumbnail Switching
    const mainImg = document.getElementById('main-product-img');
    document.querySelectorAll('.gallery-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        if (mainImg) mainImg.src = thumb.dataset.src;
      });
    });

    // Quantity Stepper
    let currentQty = 1;
    const qtyDisplay = document.getElementById('qty-display');
    const btnMinus = document.getElementById('qty-minus-btn');
    const btnPlus = document.getElementById('qty-plus-btn');

    if (btnMinus && btnPlus && qtyDisplay) {
      btnMinus.addEventListener('click', () => {
        currentQty = Math.max(1, currentQty - 1);
        qtyDisplay.textContent = currentQty;
      });
      btnPlus.addEventListener('click', () => {
        currentQty = Math.min(product.stock || 10, currentQty + 1);
        qtyDisplay.textContent = currentQty;
      });
    }

    // Add to Cart and Buy Now
    const addCartBtn = document.getElementById('detail-add-cart-btn');
    const buyNowBtn = document.getElementById('detail-buy-now-btn');
    const wishBtn = document.getElementById('detail-wishlist-btn');

    if (addCartBtn) {
      addCartBtn.addEventListener('click', () => {
        addCart(product.id, currentQty);
      });
    }

    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', () => {
        addCart(product.id, currentQty);
        window.location.href = 'checkout.html';
      });
    }

    if (wishBtn) {
      wishBtn.addEventListener('click', () => {
        const added = toggleWishlist(product.id);
        const iconSpan = wishBtn.querySelector('.icon');
        const textSpan = wishBtn.querySelector('span:last-child');
        if (iconSpan) iconSpan.style.color = added ? '#e11d48' : '';
        if (textSpan) textSpan.textContent = added ? 'Saved in Wishlist' : 'Save to Wishlist';
      });
    }

    // Pincode Validator
    const pincodeInput = document.getElementById('pincode-input');
    const pincodeBtn = document.getElementById('pincode-check-btn');
    const pincodeFeedback = document.getElementById('pincode-feedback');

    if (pincodeBtn && pincodeInput && pincodeFeedback) {
      pincodeBtn.addEventListener('click', () => {
        const pin = pincodeInput.value.trim();
        // Check for 6-digit Delhi / NCR pincodes (starts with 11 for Delhi, 201 for Noida/Gzb, 122 for Gurugram)
        if (/^(11\d{4}|201\d{3}|122\d{3})$/.test(pin)) {
          pincodeFeedback.innerHTML = `<strong style="color:var(--emerald-text);">✓ Pincode ${pin} qualifies for Free Same-Day / 24h Doorstep Pickup & Delivery!</strong>`;
        } else if (/^\d{6}$/.test(pin)) {
          pincodeFeedback.innerHTML = `<span style="color:var(--primary);">✓ Pincode ${pin} qualifies for Standard Insured Courier Shipping (2–4 Business Days).</span>`;
        } else {
          pincodeFeedback.innerHTML = `<span style="color:var(--red);">Please enter a valid 6-digit postal pincode.</span>`;
        }
      });
    }

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content-panel').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.tabTarget);
        if (target) target.classList.add('active');
      });
    });
  }

  // Initialization router
  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    if (page === 'buy' || page === 'parts') {
      initProductListing();
    } else if (page === 'product') {
      initProductDetail();
    }
  });
})();
