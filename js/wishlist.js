/**
 * BHERAL SYSTEMS & SERVICES - WISHLIST CONTROLLER
 * Manages wishlist.html view, item removal, moving items to cart, and empty states.
 */
(() => {
  'use strict';

  function initWishlistView() {
    const container = document.getElementById('wishlist-page-app');
    if (!container) return;

    const { safeGet, keys, money, escapeHTML, productById, toggleWishlist, addCart, updateCounts, toast } = window.BSS;

    function renderWishlist() {
      const wishlistIds = safeGet(keys.wishlist, []);
      const items = wishlistIds
        .map(id => productById(id))
        .filter(Boolean);

      if (!items.length) {
        container.innerHTML = `
          <section class="page-hero">
            <div class="container">
              <div class="breadcrumbs"><a href="index.html">Home</a> <span>/</span> <span>Wishlist</span></div>
              <h1>Saved Items & Wishlist</h1>
              <p>Keep track of refurbished laptops and computer parts you're comparing.</p>
            </div>
          </section>
          <section class="section">
            <div class="container">
              <div class="cart-card" style="text-align:center;padding:4rem 2rem;">
                <div style="width:72px;height:72px;border-radius:50%;background:var(--surface-container);color:var(--primary);display:grid;place-items:center;margin:0 auto 1.5rem;">
                  <span class="icon" style="font-size:36px;">favorite_border</span>
                </div>
                <h2>Your Wishlist is Empty</h2>
                <p style="color:var(--on-surface-variant);max-width:440px;margin:0 auto 2rem;">
                  You haven't saved any computers or components yet. Browse our tested stock and click the heart icon on any device to save it here.
                </p>
                <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                  <a class="btn btn-primary" href="buy.html">Browse Refurbished Laptops</a>
                  <a class="btn btn-secondary" href="parts.html">Shop Computer Parts</a>
                </div>
              </div>
            </div>
          </section>
        `;
        updateCounts();
        return;
      }

      container.innerHTML = `
        <section class="page-hero">
          <div class="container">
            <div class="breadcrumbs"><a href="index.html">Home</a> <span>/</span> <span>Wishlist</span></div>
            <h1>Your Saved Wishlist (${items.length} ${items.length === 1 ? 'Item' : 'Items'})</h1>
            <p>Products stay saved on this device. Move them to your cart when ready to place a demo order.</p>
          </div>
        </section>

        <section class="section">
          <div class="container">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
              <span style="font-weight:600;color:var(--on-surface-variant);">${items.length} saved product${items.length === 1 ? '' : 's'}</span>
              <button class="btn btn-secondary btn-small" id="wishlist-move-all">
                <span class="icon">shopping_bag</span> Move All to Cart
              </button>
            </div>

            <div class="product-grid">
              ${items.map(p => {
                const conditionClass = p.condition === 'New' ? 'badge-blue' : 'badge-green';
                const conditionText = p.condition === 'New' ? 'Brand New OEM' : `Refurbished ${p.condition}`;

                return `
                  <article class="product-card" data-product="${p.id}">
                    <div class="product-card-top">
                      <span class="badge ${conditionClass}">${conditionText}</span>
                      <button class="wish-btn active" data-action="remove-wish" data-id="${p.id}" aria-label="Remove from wishlist" title="Remove from wishlist">
                        <span class="icon">delete</span>
                      </button>
                    </div>
                    <a class="product-image-wrap" href="product.html?id=${p.id}">
                      <img src="${p.image}" alt="${escapeHTML(p.name)}" loading="lazy">
                    </a>
                    <h3><a href="product.html?id=${p.id}">${escapeHTML(p.name)}</a></h3>
                    <div class="spec-pills-row">
                      ${p.processor && p.processor !== '—' ? `<span class="spec">${escapeHTML(p.processor.split('(')[0].trim())}</span>` : ''}
                      ${p.ram ? `<span class="spec">${p.ram}GB RAM</span>` : ''}
                      ${p.storage ? `<span class="spec">${p.storage}GB ${p.storageType || 'SSD'}</span>` : ''}
                    </div>
                    <div class="rating-row">
                      <span class="icon" style="font-size:16px;">star</span>
                      <strong>${p.rating}</strong>
                      <span class="muted">(${p.reviewCount} reviews)</span>
                      ${p.stock > 0 ? `<span class="badge badge-green" style="margin-left:auto;font-size:9px;">In Stock (${p.stock})</span>` : ''}
                    </div>
                    <div class="price-box">
                      <span class="price">${money(p.price)}</span>
                      ${p.originalPrice ? `<span class="old-price">${money(p.originalPrice)}</span>` : ''}
                      ${p.discount ? `<span class="discount">${p.discount}% OFF</span>` : ''}
                    </div>
                    <div class="card-actions">
                      <button class="btn btn-primary btn-small" data-action="move-cart" data-id="${p.id}">
                        <span class="icon" style="font-size:16px;">shopping_bag</span> Add to Cart
                      </button>
                      <a class="btn btn-secondary btn-small" href="product.html?id=${p.id}">Details</a>
                    </div>
                  </article>
                `;
              }).join('')}
            </div>
          </div>
        </section>
      `;

      updateCounts();

      // Bind actions
      container.querySelectorAll('[data-action="remove-wish"]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const id = btn.dataset.id;
          toggleWishlist(id);
          renderWishlist();
        });
      });

      container.querySelectorAll('[data-action="move-cart"]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const id = btn.dataset.id;
          addCart(id, 1);
          toggleWishlist(id);
          renderWishlist();
        });
      });

      const moveAllBtn = document.getElementById('wishlist-move-all');
      if (moveAllBtn) {
        moveAllBtn.addEventListener('click', () => {
          items.forEach(p => addCart(p.id, 1));
          window.BSS.save(keys.wishlist, []);
          toast(`Moved ${items.length} items to your shopping cart!`, 'success');
          renderWishlist();
        });
      }
    }

    renderWishlist();
  }

  document.addEventListener('DOMContentLoaded', initWishlistView);
})();
