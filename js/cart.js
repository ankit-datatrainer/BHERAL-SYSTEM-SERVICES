/**
 * BHERAL SYSTEMS & SERVICES - SHOPPING CART CONTROLLER
 * Manages cart.html view, quantity modifications, removals, order totals, and empty states.
 */
(() => {
  'use strict';

  function initCartView() {
    const cartContainer = document.getElementById('cart-page-app');
    if (!cartContainer) return;

    const { safeGet, save, keys, money, escapeHTML, productById, updateCounts, toast } = window.BSS;

    function renderCart() {
      const rawCart = safeGet(keys.cart, []);
      const items = rawCart
        .map(row => ({ ...row, product: productById(row.id) }))
        .filter(item => item.product);

      if (!items.length) {
        cartContainer.innerHTML = `
          <section class="page-hero">
            <div class="container">
              <div class="breadcrumbs"><a href="index.html">Home</a> <span>/</span> <span>Shopping Cart</span></div>
              <h1>Your Shopping Cart</h1>
              <p>Review items, adjust quantities, and proceed to checkout.</p>
            </div>
          </section>
          <section class="section">
            <div class="container">
              <div class="cart-card" style="text-align:center;padding:4rem 2rem;">
                <div style="width:72px;height:72px;border-radius:50%;background:var(--surface-container);color:var(--primary);display:grid;place-items:center;margin:0 auto 1.5rem;">
                  <span class="icon" style="font-size:36px;">remove_shopping_cart</span>
                </div>
                <h2>Your Shopping Cart is Empty</h2>
                <p style="color:var(--on-surface-variant);max-width:420px;margin:0 auto 2rem;">
                  You have no items in your cart. Explore our certified refurbished business laptops or high-speed components.
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

      const subtotal = items.reduce((acc, item) => acc + item.product.price * (item.qty || 1), 0);
      const deliveryFee = 0; // Free doorstep delivery promotional
      const total = subtotal + deliveryFee;

      cartContainer.innerHTML = `
        <section class="page-hero">
          <div class="container">
            <div class="breadcrumbs"><a href="index.html">Home</a> <span>/</span> <span>Shopping Cart</span></div>
            <h1>Shopping Cart (${items.length} ${items.length === 1 ? 'Item' : 'Items'})</h1>
            <p>Every certified refurbished computer includes our 6-Month Replacement Warranty and Doorstep Service.</p>
          </div>
        </section>

        <section class="section">
          <div class="container">
            <div class="cart-grid">
              <!-- Left: Items List -->
              <div class="cart-card">
                <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:1rem;border-bottom:1.5px solid var(--border);margin-bottom:1rem;">
                  <h2 style="font-size:1.2rem;margin:0;">Products in Cart</h2>
                  <button class="text-link" id="cart-clear-btn" style="font-size:12px;cursor:pointer;">Clear All Items</button>
                </div>

                <div class="cart-items-wrapper">
                  ${items.map(({ product, qty }) => `
                    <article class="cart-item-row" data-cart-item="${product.id}">
                      <img src="${product.image}" alt="${escapeHTML(product.name)}">
                      <div>
                        <h3 style="font-size:15px;margin-bottom:0.25rem;">
                          <a href="product.html?id=${product.id}">${escapeHTML(product.name)}</a>
                        </h3>
                        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem;">
                          ${product.processor && product.processor !== '—' ? `<span class="spec">${escapeHTML(product.processor.split('(')[0])}</span>` : ''}
                          ${product.ram ? `<span class="spec">${product.ram}GB RAM</span>` : ''}
                          ${product.storage ? `<span class="spec">${product.storage}GB ${product.storageType || 'SSD'}</span>` : ''}
                        </div>
                        <div style="display:flex;align-items:center;gap:0.75rem;">
                          <span class="price" style="font-size:1.25rem;color:var(--primary);">${money(product.price)}</span>
                          ${product.originalPrice ? `<span class="old-price">${money(product.originalPrice)}</span>` : ''}
                        </div>
                        <button class="text-link" data-action="remove" data-id="${product.id}" style="color:var(--red);font-size:12px;margin-top:0.5rem;cursor:pointer;">
                          <span class="icon" style="font-size:14px;">delete</span> Remove item
                        </button>
                      </div>
                      <div class="qty-control">
                        <button data-action="qty-dec" data-id="${product.id}" aria-label="Decrease quantity">−</button>
                        <span>${qty}</span>
                        <button data-action="qty-inc" data-id="${product.id}" aria-label="Increase quantity">+</button>
                      </div>
                    </article>
                  `).join('')}
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);">
                  <a class="btn btn-secondary" href="buy.html">
                    <span class="icon">arrow_back</span> Continue Shopping
                  </a>
                  <span style="color:var(--emerald-text);font-weight:600;font-size:13px;display:flex;align-items:center;gap:0.35rem;">
                    <span class="icon">verified_user</span> 100% Buyer Protection & Warranty
                  </span>
                </div>
              </div>

              <!-- Right: Order Summary Sidebar -->
              <aside class="summary-card">
                <h2 style="font-size:1.3rem;margin-bottom:1.25rem;">Order Summary</h2>
                <div class="summary-row">
                  <span>Subtotal</span>
                  <strong>${money(subtotal)}</strong>
                </div>
                <div class="summary-row">
                  <span>Doorstep Pickup & Delivery</span>
                  <strong style="color:var(--emerald-text);">FREE</strong>
                </div>
                <div class="summary-row">
                  <span>GST Invoicing</span>
                  <span>Included</span>
                </div>
                <div class="summary-row">
                  <span>Warranty Coverage</span>
                  <span>6 Months Written</span>
                </div>
                <div class="summary-row total">
                  <span>Estimated Total</span>
                  <span style="color:var(--primary);">${money(total)}</span>
                </div>

                <div style="margin-top:1.5rem;display:flex;flex-direction:column;gap:0.75rem;">
                  <a class="btn btn-primary btn-lg btn-block" href="checkout.html">
                    Proceed to Checkout <span class="icon">arrow_forward</span>
                  </a>
                  <a class="btn btn-green btn-block" href="https://wa.me/919654779949?text=${encodeURIComponent(`Hi Bheral Systems, I have ${items.length} item(s) in my cart totaling ${money(total)}. I would like to place an order via WhatsApp.`)}" target="_blank" rel="noopener">
                    <span class="icon">chat</span> Fast Order via WhatsApp
                  </a>
                </div>

                <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:0.5rem;font-size:11.5px;color:var(--on-surface-variant);">
                  <div style="display:flex;align-items:center;gap:0.4rem;">
                    <span class="icon" style="color:var(--emerald-text);font-size:16px;">check_circle</span>
                    <span>No online payment needed today (Pay on Delivery / Spot UPI)</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.4rem;">
                    <span class="icon" style="color:var(--primary);font-size:16px;">local_shipping</span>
                    <span>Doorstep inspection prior to handover in Delhi NCR</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      `;

      bindCartActions();
      updateCounts();
    }

    function bindCartActions() {
      // Clear All
      const clearBtn = document.getElementById('cart-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          save(keys.cart, []);
          toast('Your cart has been cleared');
          renderCart();
        });
      }

      // Quantity adjustments and item removals
      cartContainer.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          const id = btn.dataset.id;
          let cart = safeGet(keys.cart, []);
          const target = cart.find(row => row.id === id);

          if (!target) return;

          if (action === 'qty-inc') {
            target.qty = Math.min(10, (target.qty || 1) + 1);
            save(keys.cart, cart);
            renderCart();
          } else if (action === 'qty-dec') {
            if ((target.qty || 1) > 1) {
              target.qty -= 1;
              save(keys.cart, cart);
              renderCart();
            } else {
              cart = cart.filter(row => row.id !== id);
              save(keys.cart, cart);
              toast('Item removed from cart');
              renderCart();
            }
          } else if (action === 'remove') {
            cart = cart.filter(row => row.id !== id);
            save(keys.cart, cart);
            toast('Item removed from cart');
            renderCart();
          }
        });
      });
    }

    renderCart();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'cart') {
      initCartView();
    }
  });
})();
