/**
 * BHERAL SYSTEMS & SERVICES - REQUEST TRACKING CONTROLLER
 * Searches local orders, sell requests, and repair requests by Request ID & Phone.
 * Renders verified multi-step status timelines for Orders, Sells, and Repairs.
 */
(() => {
  'use strict';

  function initTrackingView() {
    const container = document.getElementById('tracking-page-app');
    if (!container) return;

    const { safeGet, keys, escapeHTML, money, toast } = window.BSS;

    const params = new URLSearchParams(window.location.search);
    const initialId = params.get('id') || '';
    const initialPhone = params.get('phone') || '';

    // Timeline milestone definitions
    const timelines = {
      order: [
        'Order Confirmed',
        'Processing',
        'Packed',
        'Dispatched',
        'Delivered'
      ],
      sell: [
        'Request Submitted',
        'Pickup Scheduled',
        'Inspection',
        'Final Value Confirmed',
        'Payment Processing',
        'Completed'
      ],
      repair: [
        'Request Submitted',
        'Pickup Scheduled',
        'Device Received',
        'Diagnosis',
        'Quote Shared',
        'Repair Approved',
        'Repair in Progress',
        'Quality Check',
        'Ready for Delivery',
        'Delivered'
      ]
    };

    function renderPage() {
      container.innerHTML = `
        <section class="page-hero">
          <div class="container">
            <div class="breadcrumbs"><a href="index.html">Home</a> <span>/</span> <span>Track Request</span></div>
            <h1>Track Order, Selling, or Repair Request</h1>
            <p>Real-time milestone transparency for every hardware order, buyback valuation, and bench repair.</p>
          </div>
        </section>

        <section class="section">
          <div class="container" style="max-width:860px;">
            <!-- Search Card -->
            <div class="form-card" style="margin-bottom:2rem;">
              <h2 style="font-size:1.4rem;margin-bottom:0.5rem;">Enter Your Tracking Details</h2>
              <p style="color:var(--on-surface-variant);font-size:14px;margin-bottom:1.5rem;">
                Enter the Reference ID provided at confirmation (e.g. <code>BSS-ORD-...</code>, <code>BSS-SELL-...</code>, <code>BSS-REP-...</code>) and the registered mobile number.
              </p>

              <form id="track-lookup-form" novalidate>
                <div class="form-grid">
                  <label class="field">
                    <span>Reference / Request ID *</span>
                    <input type="text" id="track-id-input" required placeholder="e.g. BSS-ORD-584920" value="${escapeHTML(initialId)}" style="font-family:var(--font-mono);text-transform:uppercase;">
                  </label>
                  <label class="field">
                    <span>Registered Phone Number *</span>
                    <input type="tel" id="track-phone-input" required placeholder="10-digit mobile number" maxlength="10" inputmode="numeric" value="${escapeHTML(initialPhone)}">
                  </label>
                </div>

                <div style="display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap;align-items:center;">
                  <button type="submit" class="btn btn-primary btn-lg" style="flex:1;min-width:200px;">
                    <span class="icon">search</span> Track Status
                  </button>
                </div>
              </form>

              <!-- Quick Demo Samples -->
              <div style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid var(--border);">
                <span style="font-size:12px;font-weight:700;color:var(--on-surface-variant);text-transform:uppercase;display:block;margin-bottom:0.5rem;">
                  Quick Demo Test Records (Click to test):
                </span>
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                  <button type="button" class="btn btn-secondary btn-small demo-track-fill" data-id="BSS-ORD-584920" data-phone="9876543210">
                    <span class="icon" style="font-size:14px;">shopping_bag</span> Order: BSS-ORD-584920
                  </button>
                  <button type="button" class="btn btn-secondary btn-small demo-track-fill" data-id="BSS-SELL-839102" data-phone="9876543210">
                    <span class="icon" style="font-size:14px;">currency_rupee</span> Sell: BSS-SELL-839102
                  </button>
                  <button type="button" class="btn btn-secondary btn-small demo-track-fill" data-id="BSS-REP-294711" data-phone="9876543210">
                    <span class="icon" style="font-size:14px;">handyman</span> Repair: BSS-REP-294711
                  </button>
                </div>
              </div>
            </div>

            <!-- Result Destination Area -->
            <div id="track-result-container"></div>
          </div>
        </section>
      `;

      bindEvents();

      // Auto search if query params provided
      if (initialId && initialPhone) {
        performLookup(initialId, initialPhone);
      }
    }

    function bindEvents() {
      const form = document.getElementById('track-lookup-form');
      form.addEventListener('submit', e => {
        e.preventDefault();
        const id = document.getElementById('track-id-input').value.trim();
        const phone = document.getElementById('track-phone-input').value.trim().replace(/\D/g, '');

        if (!id) {
          toast('Please enter your Request ID', 'error');
          document.getElementById('track-id-input').focus();
          return;
        }

        if (!phone || phone.length !== 10) {
          toast('Please enter your 10-digit mobile number', 'error');
          document.getElementById('track-phone-input').focus();
          return;
        }

        performLookup(id, phone);
      });

      // Quick demo fill buttons
      document.querySelectorAll('.demo-track-fill').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('track-id-input').value = btn.dataset.id;
          document.getElementById('track-phone-input').value = btn.dataset.phone;
          performLookup(btn.dataset.id, btn.dataset.phone);
        });
      });
    }

    function performLookup(id, phone) {
      const resultArea = document.getElementById('track-result-container');
      if (!resultArea) return;

      const cleanId = id.toUpperCase().trim();
      const cleanPhone = phone.replace(/\D/g, '');

      // Search all pools
      const orders = safeGet(keys.orders, []);
      const sells = safeGet(keys.sells, []);
      const repairs = safeGet(keys.repairs, []);

      const record = [...orders, ...sells, ...repairs].find(r => {
        const idMatch = r.id && r.id.toUpperCase() === cleanId;
        const phoneMatch = r.phone && r.phone.replace(/\D/g, '') === cleanPhone;
        return idMatch && phoneMatch;
      });

      if (!record) {
        resultArea.innerHTML = `
          <div class="cart-card" style="text-align:center;padding:3rem 1.5rem;">
            <div style="width:64px;height:64px;border-radius:50%;background:var(--red-soft);color:var(--red);display:grid;place-items:center;margin:0 auto 1.25rem;">
              <span class="icon" style="font-size:32px;">search_off</span>
            </div>
            <h2 style="font-size:1.4rem;margin-bottom:0.5rem;">No Matching Request Found</h2>
            <p style="color:var(--on-surface-variant);max-width:440px;margin:0 auto 1.5rem;">
              We couldn't locate any record matching ID <code>${escapeHTML(cleanId)}</code> and mobile number <strong>${escapeHTML(cleanPhone)}</strong> on this device.
            </p>
            <p style="font-size:13px;color:var(--on-surface-variant);">
              Please verify the characters in your ID or click one of the pre-seeded demo records above.
            </p>
          </div>
        `;
        return;
      }

      renderRecordTimeline(record, resultArea);
    }

    function renderRecordTimeline(record, target) {
      const type = record.type || (record.id.startsWith('BSS-ORD') ? 'order' : record.id.startsWith('BSS-SELL') ? 'sell' : 'repair');
      const steps = timelines[type] || timelines.order;
      const currentIdx = Math.min(record.status || 0, steps.length - 1);

      let typeBadge = 'badge-blue';
      let typeLabel = 'Refurbished Hardware Order';
      let icon = 'shopping_bag';

      if (type === 'sell') {
        typeBadge = 'badge-green';
        typeLabel = 'Device Buyback & Valuation';
        icon = 'currency_rupee';
      } else if (type === 'repair') {
        typeBadge = 'badge-amber';
        typeLabel = 'Hardware & Chip-Level Repair';
        icon = 'handyman';
      }

      target.innerHTML = `
        <div class="cart-card" style="padding:2rem;">
          <!-- Header info -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border);">
            <div>
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;">
                <span class="badge ${typeBadge}"><span class="icon" style="font-size:14px;">${icon}</span> ${typeLabel}</span>
                <span style="font-size:12px;color:var(--on-surface-variant);">${new Date(record.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <h2 style="font-family:var(--font-mono);font-size:1.75rem;color:var(--primary);margin:0;letter-spacing:1px;">
                ${record.id}
              </h2>
            </div>
            <div style="text-align:right;">
              <span style="font-size:12px;color:var(--on-surface-variant);display:block;">Current Status</span>
              <span class="badge badge-green" style="font-size:13px;padding:0.4rem 0.8rem;">
                ● ${steps[currentIdx]}
              </span>
            </div>
          </div>

          <!-- Visual Progress Timeline -->
          <div class="timeline" style="margin-bottom:2.5rem;">
            ${steps.map((stepName, idx) => {
              const isDone = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const statusClass = isCurrent ? 'current' : isDone ? 'done' : '';

              return `
                <div class="timeline-step ${statusClass}">
                  <strong style="display:block;margin-bottom:0.25rem;">${stepName}</strong>
                  <small style="color:var(--on-surface-variant);font-size:11px;">
                    ${isCurrent ? 'In Progress' : isDone ? 'Completed' : 'Upcoming'}
                  </small>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Detailed Summary Box -->
          <div style="background:var(--surface-container-low);border-radius:var(--radius-DEFAULT);padding:1.5rem;margin-bottom:1.5rem;">
            <h3 style="font-size:15px;margin-bottom:1rem;color:var(--on-surface);">Request Particulars</h3>
            <table class="spec-table" style="background:transparent;">
              ${renderRecordDetailsRows(record, type)}
            </table>
          </div>

          <!-- Actions -->
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
            <a class="btn btn-secondary" href="index.html">
              <span class="icon">home</span> Return to Home
            </a>
            <a class="btn btn-green" href="https://wa.me/919654779949?text=${encodeURIComponent(`Hi Bheral Systems, checking update on my request ${record.id} (Phone: ${record.phone}). Current status: ${steps[currentIdx]}.`)}" target="_blank" rel="noopener">
              <span class="icon">chat</span> Ask Coordinator on WhatsApp
            </a>
          </div>
        </div>
      `;

      target.scrollIntoView({ behavior: 'smooth' });
    }

    function renderRecordDetailsRows(r, type) {
      if (type === 'order') {
        return `
          <tr><td>Customer Name</td><td><strong>${escapeHTML(r.customer?.name || '—')}</strong></td></tr>
          <tr><td>Delivery Destination</td><td>${escapeHTML(r.customer?.address || '—')}, ${escapeHTML(r.customer?.city || 'Delhi')} - ${r.customer?.pincode || ''}</td></tr>
          <tr><td>Delivery Option</td><td><span class="badge badge-blue">${r.customer?.deliveryMethod || 'Doorstep Delivery'}</span></td></tr>
          <tr><td>Payment Selected</td><td>${r.customer?.paymentPreference || 'Cash on Delivery'}</td></tr>
          <tr><td>Order Total</td><td><strong style="color:var(--primary);font-size:1.1rem;">${money(r.total)}</strong></td></tr>
          <tr><td>Included Warranty</td><td>6-Month Replacement Hardware Guarantee</td></tr>
        `;
      } else if (type === 'sell') {
        return `
          <tr><td>Seller Name</td><td><strong>${escapeHTML(r.customer?.name || r.customer?.fullName || '—')}</strong></td></tr>
          <tr><td>Device Declared</td><td><strong>${escapeHTML(r.device?.brand || '')} ${escapeHTML(r.device?.model || r.device?.category || '')}</strong></td></tr>
          <tr><td>Declared Condition</td><td>${r.device?.condition || 'Good'}</td></tr>
          <tr><td>Provisional Estimate</td><td><strong style="color:var(--emerald-text);font-size:1.1rem;">${money(r.device?.estimate || 0)}</strong> (Subject to verification)</td></tr>
          <tr><td>Pickup Address</td><td>${escapeHTML(r.customer?.address || '—')}, ${escapeHTML(r.customer?.city || 'Delhi')} - ${r.customer?.pincode || ''}</td></tr>
          <tr><td>Scheduled Slot</td><td>${r.customer?.preferredDate || 'Scheduled'} (${r.customer?.preferredTime || 'Business Hours'})</td></tr>
        `;
      } else {
        // repair
        return `
          <tr><td>Client Name</td><td><strong>${escapeHTML(r.customer?.name || r.customer?.fullName || '—')}</strong></td></tr>
          <tr><td>Hardware Machine</td><td><strong>${escapeHTML(r.details?.brand || '')} ${escapeHTML(r.details?.model || r.details?.device || '')}</strong></td></tr>
          <tr><td>Reported Issue</td><td><span class="badge badge-amber">${r.details?.problem || 'Diagnostic'}</span></td></tr>
          <tr><td>Symptoms Stated</td><td>${escapeHTML(r.details?.description || 'Diagnostic investigation requested.')}</td></tr>
          <tr><td>Service Method</td><td><span class="badge badge-blue">${r.details?.method || 'Pickup & Drop'}</span></td></tr>
          <tr><td>Service Address</td><td>${escapeHTML(r.customer?.address || '—')}, ${escapeHTML(r.customer?.city || 'Delhi')} - ${r.customer?.pincode || ''}</td></tr>
        `;
      }
    }

    renderPage();
  }

  document.addEventListener('DOMContentLoaded', initTrackingView);
})();
