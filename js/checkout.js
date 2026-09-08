/**
 * BHERAL SYSTEMS & SERVICES - CHECKOUT CONTROLLER
 * Manages checkout.html view, multi-field customer & address validation,
 * payment selection UI, order number generation (BSS-ORD-XXXXXX), and localStorage order persistence.
 */
(() => {
  'use strict';

  function initCheckoutView() {
    const container = document.getElementById('checkout-page-app');
    if (!container) return;

    const { safeGet, save, keys, money, escapeHTML, productById, uniqueId, updateCounts, toast } = window.BSS;

    function renderCheckout() {
      const rawCart = safeGet(keys.cart, []);
      const items = rawCart
        .map(row => ({ ...row, product: productById(row.id) }))
        .filter(item => item.product);

      if (!items.length) {
        container.innerHTML = `
          <section class="page-hero">
            <div class="container">
              <div class="breadcrumbs"><a href="index.html">Home</a> <span>/</span> <span>Checkout</span></div>
              <h1>Checkout</h1>
              <p>Your shopping cart is currently empty.</p>
            </div>
          </section>
          <section class="section">
            <div class="container">
              <div class="cart-card" style="text-align:center;padding:4rem 2rem;">
                <div style="width:72px;height:72px;border-radius:50%;background:var(--surface-container);color:var(--primary);display:grid;place-items:center;margin:0 auto 1.5rem;">
                  <span class="icon" style="font-size:36px;">shopping_bag</span>
                </div>
                <h2>No Items to Checkout</h2>
                <p style="color:var(--on-surface-variant);max-width:420px;margin:0 auto 2rem;">
                  Please add a refurbished laptop or computer component to your cart before proceeding to checkout.
                </p>
                <a class="btn btn-primary" href="buy.html">Browse Refurbished Laptops</a>
              </div>
            </div>
          </section>
        `;
        return;
      }

      const subtotal = items.reduce((acc, item) => acc + item.product.price * (item.qty || 1), 0);
      const delivery = 0; // Free promotion
      const total = subtotal + delivery;

      container.innerHTML = `
        <section class="page-hero">
          <div class="container">
            <div class="breadcrumbs">
              <a href="index.html">Home</a> <span>/</span> <a href="cart.html">Cart</a> <span>/</span> <span>Checkout</span>
            </div>
            <h1>Secure Demo Checkout</h1>
            <p>Review shipping destination and preferred payment method for your verified hardware order.</p>
          </div>
        </section>

        <section class="section">
          <div class="container">
            <div class="checkout-layout">
              <!-- Left: Checkout Form -->
              <div class="checkout-main">
                <form id="checkout-order-form" class="form-card" novalidate>
                  <!-- Notice -->
                  <div style="background:var(--surface-container-low);border-left:4px solid var(--primary);border-radius:var(--radius-DEFAULT);padding:0.875rem 1rem;margin-bottom:1.5rem;font-size:13px;display:flex;align-items:flex-start;gap:0.75rem;">
                    <span class="icon" style="color:var(--primary);font-size:20px;">info</span>
                    <div>
                      <strong>Front-End Prototype Notice:</strong>
                      No monetary payment is charged online. Demo orders generate a unique tracking ID and are saved to local storage on this browser for delivery scheduling.
                    </div>
                  </div>

                  <!-- 1. Customer Information -->
                  <div class="form-section">
                    <div class="form-section-head">
                      <span class="step-badge">1</span>
                      <h2>Customer Contact Information</h2>
                    </div>
                    <div class="form-grid">
                      <label class="field">
                        <span>Full Name *</span>
                        <input type="text" name="customerName" id="cust-name" required placeholder="e.g. Rahul Sharma" autocomplete="name">
                      </label>
                      <label class="field">
                        <span>Mobile Phone * (10 Digits)</span>
                        <input type="tel" name="customerPhone" id="cust-phone" required placeholder="9876543210" maxlength="10" inputmode="numeric" autocomplete="tel">
                      </label>
                      <label class="field full">
                        <span>Email Address *</span>
                        <input type="email" name="customerEmail" id="cust-email" required placeholder="rahul.sharma@example.com" autocomplete="email">
                      </label>
                    </div>
                  </div>

                  <!-- 2. Delivery Address -->
                  <div class="form-section">
                    <div class="form-section-head">
                      <span class="step-badge">2</span>
                      <h2>Delivery Destination</h2>
                    </div>
                    <div class="form-grid">
                      <label class="field full">
                        <span>Street Address / Flat / Building *</span>
                        <input type="text" name="addressStreet" id="addr-street" required placeholder="Flat 304, Tower B, Galaxy Apartments" autocomplete="street-address">
                      </label>
                      <label class="field">
                        <span>Locality / Sector / Area *</span>
                        <input type="text" name="addressArea" id="addr-area" required placeholder="Nehru Place / Mayur Vihar">
                      </label>
                      <label class="field">
                        <span>City *</span>
                        <input type="text" name="addressCity" id="addr-city" required value="Delhi" placeholder="Delhi / NCR">
                      </label>
                      <label class="field">
                        <span>State *</span>
                        <input type="text" name="addressState" id="addr-state" required value="Delhi" placeholder="Delhi">
                      </label>
                      <label class="field">
                        <span>Pincode * (6 Digits)</span>
                        <input type="text" name="addressPincode" id="addr-pin" required placeholder="110019" maxlength="6" inputmode="numeric">
                      </label>
                    </div>
                  </div>

                  <!-- 3. Delivery Method -->
                  <div class="form-section">
                    <div class="form-section-head">
                      <span class="step-badge">3</span>
                      <h2>Delivery Method</h2>
                    </div>
                    <div class="choice-grid">
                      <label class="choice">
                        <input type="radio" name="deliveryMethod" value="Free Doorstep Delivery" checked>
                        <div>
                          <strong>Free Doorstep Delivery (Delhi NCR)</strong>
                          <p style="margin:0;font-size:12px;color:var(--on-surface-variant);">1–2 Business Days. Dispatched from our Rohini facility.</p>
                        </div>
                      </label>
                      <label class="choice">
                        <input type="radio" name="deliveryMethod" value="Express 24-Hour Delivery">
                        <div>
                          <strong>Express 24-Hour Hand Delivery</strong>
                          <p style="margin:0;font-size:12px;color:var(--on-surface-variant);">Available for eligible central Delhi pincodes.</p>
                        </div>
                      </label>
                      <label class="choice">
                        <input type="radio" name="deliveryMethod" value="Store Pickup">
                        <div>
                          <strong>Store Pickup (Sector 11, Rohini)</strong>
                          <p style="margin:0;font-size:12px;color:var(--on-surface-variant);">Collect today after 2:00 PM. Hands-on testing available.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <!-- 4. Payment Preference -->
                  <div class="form-section">
                    <div class="form-section-head">
                      <span class="step-badge">4</span>
                      <h2>Payment Preference</h2>
                    </div>
                    <div class="choice-grid">
                      <label class="choice">
                        <input type="radio" name="paymentPreference" value="Cash on Delivery" checked>
                        <div>
                          <strong>Cash on Delivery (COD)</strong>
                          <p style="margin:0;font-size:12px;color:var(--on-surface-variant);">Pay in cash after inspecting hardware upon delivery.</p>
                        </div>
                      </label>
                      <label class="choice">
                        <input type="radio" name="paymentPreference" value="UPI on Confirmation">
                        <div>
                          <strong>UPI on Delivery / Dispatch</strong>
                          <p style="margin:0;font-size:12px;color:var(--on-surface-variant);">Google Pay, PhonePe, Paytm, or BHIM QR code.</p>
                        </div>
                      </label>
                      <label class="choice">
                        <input type="radio" name="paymentPreference" value="Card on Delivery">
                        <div>
                          <strong>Card Swipe on Delivery</strong>
                          <p style="margin:0;font-size:12px;color:var(--on-surface-variant);">Debit or Credit card POS terminal at your doorstep.</p>
                        </div>
                      </label>
                      <label class="choice">
                        <input type="radio" name="paymentPreference" value="NEFT / RTGS (Corporate GST)">
                        <div>
                          <strong>NEFT / RTGS (Corporate GST Invoice)</strong>
                          <p style="margin:0;font-size:12px;color:var(--on-surface-variant);">Direct bank transfer with tax invoice for business orders.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <button type="submit" class="btn btn-primary btn-lg btn-block" id="place-order-btn" style="margin-top:1rem;">
                    <span class="icon">check_circle</span> Place Demo Order (${money(total)})
                  </button>
                </form>
              </div>

              <!-- Right: Order Summary Sidebar -->
              <aside class="summary-card">
                <h2 style="font-size:1.25rem;margin-bottom:1.25rem;">Items in Order (${items.length})</h2>
                <div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.25rem;max-height:360px;overflow-y:auto;padding-right:0.25rem;">
                  ${items.map(({ product, qty }) => `
                    <div style="display:flex;gap:0.75rem;align-items:center;padding-bottom:0.75rem;border-bottom:1px solid var(--border);">
                      <img src="${product.image}" alt="${escapeHTML(product.name)}" style="width:50px;height:50px;object-fit:cover;border-radius:var(--radius-DEFAULT);border:1px solid var(--border);">
                      <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                          ${escapeHTML(product.name)}
                        </div>
                        <div style="font-size:11px;color:var(--on-surface-variant);">Qty: ${qty} • ${product.condition}</div>
                      </div>
                      <div style="font-weight:700;font-size:13px;color:var(--primary);white-space:nowrap;">
                        ${money(product.price * qty)}
                      </div>
                    </div>
                  `).join('')}
                </div>

                <div class="summary-row">
                  <span>Subtotal</span>
                  <strong>${money(subtotal)}</strong>
                </div>
                <div class="summary-row">
                  <span>Doorstep Delivery</span>
                  <strong style="color:var(--emerald-text);">FREE</strong>
                </div>
                <div class="summary-row">
                  <span>Replacement Warranty</span>
                  <span>6 Months</span>
                </div>
                <div class="summary-row total">
                  <span>Total Due</span>
                  <span style="color:var(--primary);">${money(total)}</span>
                </div>

                <div style="margin-top:1.5rem;padding:1rem;background:var(--surface-container-low);border-radius:var(--radius-DEFAULT);font-size:12px;color:var(--on-surface-variant);display:flex;flex-direction:column;gap:0.5rem;">
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="icon" style="color:var(--emerald-text);font-size:16px;">verified</span>
                    <span>50-Point Hardware Quality Audit</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="icon" style="color:var(--primary);font-size:16px;">receipt_long</span>
                    <span>GST Invoiced & Documented</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="icon" style="color:var(--tertiary);font-size:16px;">call</span>
                    <span>Direct Helpline: +91 96547 79949</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      `;

      // Form submission & validation
      const form = document.getElementById('checkout-order-form');
      form.addEventListener('submit', e => {
        e.preventDefault();

        const name = document.getElementById('cust-name').value.trim();
        const phone = document.getElementById('cust-phone').value.trim().replace(/\D/g, '');
        const email = document.getElementById('cust-email').value.trim();
        const street = document.getElementById('addr-street').value.trim();
        const area = document.getElementById('addr-area').value.trim();
        const city = document.getElementById('addr-city').value.trim();
        const state = document.getElementById('addr-state').value.trim();
        const pincode = document.getElementById('addr-pin').value.trim().replace(/\D/g, '');

        if (!name) {
          toast('Please enter your full name', 'error');
          document.getElementById('cust-name').focus();
          return;
        }

        if (!/^\d{10}$/.test(phone)) {
          toast('Please enter a valid 10-digit mobile number', 'error');
          document.getElementById('cust-phone').focus();
          return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          toast('Please enter a valid email address', 'error');
          document.getElementById('cust-email').focus();
          return;
        }

        if (!street || !area || !city || !state) {
          toast('Please complete all delivery address fields', 'error');
          return;
        }

        if (!/^\d{6}$/.test(pincode)) {
          toast('Please enter a valid 6-digit postal pincode', 'error');
          document.getElementById('addr-pin').focus();
          return;
        }

        const deliveryMethod = form.querySelector('input[name="deliveryMethod"]:checked')?.value || 'Free Doorstep Delivery';
        const paymentPreference = form.querySelector('input[name="paymentPreference"]:checked')?.value || 'Cash on Delivery';

        const orderId = uniqueId('BSS-ORD');
        const orderRecord = {
          id: orderId,
          phone,
          createdAt: new Date().toISOString(),
          status: 0, // 0: Order Confirmed, 1: Processing, 2: Packed, 3: Dispatched, 4: Delivered
          type: 'order',
          customer: {
            name,
            phone,
            email,
            address: `${street}, ${area}`,
            city,
            state,
            pincode,
            deliveryMethod,
            paymentPreference
          },
          items: items.map(item => ({ id: item.product.id, name: item.product.name, price: item.product.price, qty: item.qty })),
          total
        };

        const existingOrders = safeGet(keys.orders, []);
        existingOrders.unshift(orderRecord);
        save(keys.orders, existingOrders);

        // Clear Cart
        save(keys.cart, []);
        updateCounts();

        // Render Confirmation Screen
        renderOrderConfirmation(orderRecord);
      });
    }

    function renderOrderConfirmation(order) {
      container.innerHTML = `
        <section class="section">
          <div class="container" style="max-width:800px;">
            <div class="cart-card" style="text-align:center;padding:3rem 2rem;">
              <div style="width:80px;height:80px;border-radius:50%;background:var(--emerald-soft);color:var(--emerald);display:grid;place-items:center;margin:0 auto 1.5rem;">
                <span class="icon" style="font-size:48px;">check_circle</span>
              </div>
              <span class="badge badge-green" style="font-size:12px;padding:0.35rem 0.75rem;margin-bottom:0.75rem;">Order Successfully Placed</span>
              <h1 style="font-size:2rem;margin-bottom:0.5rem;">Thank You, ${escapeHTML(order.customer.name)}!</h1>
              <p style="color:var(--on-surface-variant);max-width:520px;margin:0 auto 1.5rem;">
                Your demo order has been logged locally in your browser. Our Delhi dispatch coordinator will contact your number <strong>+91 ${order.phone}</strong> for delivery slot confirmation.
              </p>

              <div style="background:var(--surface-container-low);border:1.5px dashed var(--primary);border-radius:var(--radius-lg);padding:1.5rem;max-width:480px;margin:0 auto 2rem;text-align:left;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                  <span style="font-size:12px;text-transform:uppercase;color:var(--on-surface-variant);font-weight:700;">Order Reference ID</span>
                  <span class="badge badge-blue">Save this ID</span>
                </div>
                <div style="font-family:var(--font-mono);font-size:1.5rem;font-weight:800;color:var(--primary);letter-spacing:1px;margin-bottom:0.75rem;">
                  ${order.id}
                </div>
                <div style="font-size:13px;display:flex;flex-direction:column;gap:0.35rem;color:var(--on-surface);">
                  <div><strong>Total Amount:</strong> ${money(order.total)} (${order.customer.paymentPreference})</div>
                  <div><strong>Delivery To:</strong> ${escapeHTML(order.customer.address)}, ${order.customer.city} - ${order.customer.pincode}</div>
                  <div><strong>Included:</strong> 6-Month Replacement Warranty & Pre-dispatch Audit</div>
                </div>
              </div>

              <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                <a class="btn btn-primary btn-lg" href="track.html?id=${order.id}&phone=${order.phone}">
                  <span class="icon">local_shipping</span> Track This Order Now
                </a>
                <a class="btn btn-secondary btn-lg" href="index.html">
                  <span class="icon">home</span> Return to Home
                </a>
                <a class="btn btn-green btn-lg" href="https://wa.me/919654779949?text=${encodeURIComponent(`Hi Bheral Systems, I just placed order ${order.id} for ${money(order.total)}. Please confirm dispatch.`)}" target="_blank" rel="noopener">
                  <span class="icon">chat</span> WhatsApp Dispatch Desk
                </a>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    renderCheckout();
  }

  document.addEventListener('DOMContentLoaded', initCheckoutView);
})();
