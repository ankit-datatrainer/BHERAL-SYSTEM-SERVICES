/**
 * BHERAL SYSTEMS & SERVICES - REPAIR SERVICES & BOOKING WIZARD CONTROLLER
 * Manages repair.html view, 24 service cards catalog, device filter pills,
 * and 9-step repair booking wizard with local image file previews (URL.createObjectURL),
 * service method selection (Pickup & Drop, Service Center, On-Site), and BSS-REP-XXXXXX generation.
 */
(() => {
  'use strict';

  function initRepairView() {
    const container = document.getElementById('repair-page-app');
    if (!container) return;

    const { repairs } = window.BSS_DATA;
    const { safeGet, save, keys, escapeHTML, uniqueId, toast } = window.BSS;

    const params = new URLSearchParams(window.location.search);
    const preselectedService = params.get('service') || '';

    // Filter service catalog state
    let activeDeviceFilter = 'All';

    // Wizard state
    let currentStep = 0;
    const wizardSteps = [
      'Choose Device',
      'Select Problem',
      'Brand & Model',
      'Issue Description',
      'Photos (Local)',
      'Service Method',
      'Contact Details',
      'Review Request',
      'Confirmed'
    ];

    let wizardState = {
      device: 'Laptop',
      problem: preselectedService || 'Laptop Repair',
      brand: '',
      model: '',
      description: '',
      imageFiles: [], // Array of { name, url }
      serviceMethod: 'Free Doorstep Pickup & Drop',
      customer: {
        name: '',
        phone: '',
        whatsapp: '',
        email: '',
        address: '',
        area: '',
        city: 'Delhi',
        pincode: '',
        preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        preferredTime: '10:00 AM – 01:00 PM'
      }
    };

    function renderPage() {
      container.innerHTML = `
        <section class="page-hero">
          <div class="container">
            <div class="breadcrumbs"><a href="index.html">Home</a> <span>/</span> <span>Computer Repair</span></div>
            <h1>Precision Computer Hardware & Chip-Level Repair</h1>
            <p>24 specialized diagnostic, chip-level micro-soldering, and performance upgrade services across Delhi NCR.</p>
          </div>
        </section>

        <!-- Service Cards Catalog Section -->
        <section class="section-sm">
          <div class="container">
            <div class="section-head">
              <div>
                <span class="eyebrow">Rohini Hardware Laboratory</span>
                <h2>Explore Repair Services</h2>
                <p>Transparent turnaround times, genuine OEM spare parts, and written service warranties.</p>
              </div>
              <a class="btn btn-primary" href="#book-repair-wizard">
                <span class="icon">handyman</span> Jump to Booking Wizard
              </a>
            </div>

            <!-- Device Filter Pills -->
            <div class="component-strip" style="grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));margin-bottom:2rem;">
              ${['All', 'Laptop', 'Desktop', 'Printer', 'Storage Drive', 'Network'].map(dev => `
                <button type="button" class="btn ${activeDeviceFilter === dev ? 'btn-primary' : 'btn-secondary'} btn-small filter-dev-btn" data-filter="${dev}" style="justify-content:center;">
                  ${dev === 'All' ? 'All Services (24)' : dev}
                </button>
              `).join('')}
            </div>

            <!-- Services Grid -->
            <div class="service-grid" id="repair-services-grid">
              ${renderServiceCards()}
            </div>
          </div>
        </section>

        <!-- Doorstep Pickup Eligibility Banner -->
        <section class="section-sm">
          <div class="container pickup-banner">
            <div>
              <span class="eyebrow">Delhi NCR Convenience</span>
              <h2>Free Doorstep Pickup & Drop Service</h2>
              <p>Pickup & Drop services are available for eligible locations in Delhi NCR. Check your postal pincode below.</p>
              <div style="display:flex;gap:0.75rem;margin-top:1rem;flex-wrap:wrap;max-width:440px;">
                <input type="text" id="repair-pincode-test" placeholder="Enter 6-digit Delhi pincode" maxlength="6" inputmode="numeric" style="flex:1;padding:0.65rem 1rem;border-radius:var(--radius-DEFAULT);border:1px solid var(--border);outline:none;">
                <button type="button" class="btn btn-secondary" id="repair-pincode-test-btn">Check</button>
              </div>
              <div id="repair-pincode-test-result" style="font-size:12px;margin-top:0.5rem;font-weight:600;"></div>
            </div>
            <div>
              <a class="btn btn-secondary" href="https://wa.me/919654779949?text=${encodeURIComponent('Hi Bheral Systems, I want to check repair pickup availability for my location in Delhi.')}" target="_blank" rel="noopener">
                <span class="icon">chat</span> WhatsApp Technician Desk
              </a>
            </div>
          </div>
        </section>

        <!-- 9-Step Booking Wizard Section -->
        <section class="section" id="book-repair-wizard">
          <div class="container">
            <div class="wizard-layout">
              <!-- Sidebar Progress -->
              <aside class="wizard-side">
                <span class="eyebrow green">Online Appointment</span>
                <h2 style="font-size:1.3rem;margin-bottom:1.5rem;">Repair Booking</h2>
                <ol class="wizard-progress">
                  ${wizardSteps.slice(0, 8).map((label, idx) => `
                    <li class="${idx < currentStep ? 'done' : idx === currentStep ? 'active' : ''}">
                      <span class="dot">${idx < currentStep ? '✓' : idx + 1}</span>
                      <span>${label}</span>
                    </li>
                  `).join('')}
                </ol>

                <div style="margin-top:2rem;padding:1rem;background:var(--surface-container-low);border-radius:var(--radius-DEFAULT);font-size:12px;color:var(--on-surface-variant);display:flex;flex-direction:column;gap:0.75rem;">
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="icon" style="color:var(--emerald-text);font-size:18px;">verified_user</span>
                    <span>Transparent Quote Before Any Work Starts</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="icon" style="color:var(--primary);font-size:18px;">photo_library</span>
                    <span>Local Photo Preview (No Server Uploads)</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="icon" style="color:var(--secondary);font-size:18px;">handyman</span>
                    <span>Certified Chip-Level Engineers</span>
                  </div>
                </div>
              </aside>

              <!-- Wizard Main Card -->
              <div class="wizard-card" id="wizard-card-container">
                <div id="repair-step-area">
                  ${renderWizardStepContent(currentStep)}
                </div>

                <div class="wizard-actions" style="${currentStep >= 8 ? 'display:none;' : ''}">
                  <button type="button" class="btn btn-secondary" id="rep-back-btn" style="${currentStep === 0 ? 'visibility:hidden;' : ''}">
                    <span class="icon">arrow_back</span> Back
                  </button>
                  <button type="button" class="btn btn-primary" id="rep-next-btn">
                    ${currentStep === 7 ? 'Confirm & Submit Repair Request' : 'Continue'} <span class="icon">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;

      bindCatalogEvents();
      bindWizardEvents();
    }

    function renderServiceCards() {
      const filtered = activeDeviceFilter === 'All'
        ? repairs
        : repairs.filter(r => r.device.toLowerCase() === activeDeviceFilter.toLowerCase());

      return filtered.map(s => `
        <article class="service-card" data-service-id="${s.id}">
          <span class="service-icon"><span class="icon">${s.icon}</span></span>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--primary);margin-bottom:0.25rem;">
            ${s.device}
          </div>
          <h3>${escapeHTML(s.name)}</h3>
          <p>${escapeHTML(s.description)}</p>
          <footer>
            <span style="display:flex;align-items:center;gap:0.25rem;font-size:12px;color:var(--on-surface-variant);">
              <span class="icon" style="font-size:14px;">schedule</span> ${s.time}
            </span>
            <button type="button" class="text-link book-service-trigger" data-service-name="${escapeHTML(s.name)}" data-service-device="${escapeHTML(s.device)}" style="cursor:pointer;font-weight:700;">
              Book Service →
            </button>
          </footer>
        </article>
      `).join('');
    }

    function renderWizardStepContent(step) {
      switch (step) {
        case 0: // Step 1: Device
          return `
            <span class="eyebrow">Step 1 of 9</span>
            <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Choose Device Type</h2>
            <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">What kind of machine requires diagnostic attention or repair?</p>
            <div class="option-grid">
              ${[
                { name: 'Laptop', icon: 'laptop' },
                { name: 'Desktop', icon: 'desktop_windows' },
                { name: 'Printer', icon: 'print' },
                { name: 'Storage Drive', icon: 'hard_drive' },
                { name: 'Monitor', icon: 'monitor' },
                { name: 'Network', icon: 'router' }
              ].map(d => `
                <label class="option ${wizardState.device === d.name ? 'selected' : ''}">
                  <input type="radio" name="wizDevice" value="${d.name}" ${wizardState.device === d.name ? 'checked' : ''}>
                  <span class="icon">${d.icon}</span>
                  <strong>${d.name}</strong>
                </label>
              `).join('')}
            </div>
          `;

        case 1: // Step 2: Problem
          return `
            <span class="eyebrow">Step 2 of 9</span>
            <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Select Problem / Service Needed</h2>
            <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Select the primary symptom or hardware issue occurring.</p>
            <div class="option-grid" style="grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));max-height:380px;overflow-y:auto;padding-right:0.5rem;">
              ${repairs.map(r => `
                <label class="option ${wizardState.problem === r.name ? 'selected' : ''}">
                  <input type="radio" name="wizProblem" value="${r.name}" ${wizardState.problem === r.name ? 'checked' : ''}>
                  <span class="icon">${r.icon}</span>
                  <div style="text-align:left;">
                    <div style="font-weight:700;font-size:13px;">${r.name}</div>
                    <div style="font-size:11px;color:var(--on-surface-variant);">${r.time}</div>
                  </div>
                </label>
              `).join('')}
            </div>
          `;

        case 2: // Step 3: Brand & Model
          return `
            <span class="eyebrow">Step 3 of 9</span>
            <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Device Brand & Exact Model</h2>
            <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Helps our engineers verify spare parts and tool compatibility before dispatch.</p>
            <div class="form-grid">
              <label class="field">
                <span>Manufacturer Brand *</span>
                <input type="text" id="wiz-brand" required placeholder="e.g. Dell, Lenovo, Apple, HP, ASUS" value="${escapeHTML(wizardState.brand)}">
              </label>
              <label class="field">
                <span>Exact Model Number / Series *</span>
                <input type="text" id="wiz-model" required placeholder="e.g. ThinkPad T480 / MacBook Air A2337 / Inspiron 3593" value="${escapeHTML(wizardState.model)}">
              </label>
            </div>
          `;

        case 3: // Step 4: Describe Problem
          return `
            <span class="eyebrow">Step 4 of 9</span>
            <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Describe the Problem</h2>
            <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Provide any helpful context: when did it start, did it drop or spill, or are there error beeps?</p>
            <label class="field full">
              <span>Detailed Symptoms *</span>
              <textarea id="wiz-description" required rows="5" placeholder="e.g. The laptop powers on with fans spinning, but screen remains black with 3 beeps. Started yesterday after power surge.">${escapeHTML(wizardState.description)}</textarea>
            </label>
          `;

        case 4: // Step 5: Photos (Local Browser Preview)
          return `
            <span class="eyebrow">Step 5 of 9</span>
            <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Attach Photos (Browser Preview Only)</h2>
            <p style="color:var(--on-surface-variant);margin-bottom:1rem;">
              Attach photos of the damage, screen lines, or serial sticker.
            </p>
            <div style="background:var(--surface-container-low);border-left:4px solid var(--primary);padding:0.75rem 1rem;border-radius:var(--radius-DEFAULT);margin-bottom:1.5rem;font-size:13px;">
              <strong>Note:</strong> Selected files are previewed safely in your local browser using client-side object URLs and are <em>not</em> transmitted to any external server.
            </div>

            <input type="file" id="wiz-file-input" accept="image/*" multiple style="margin-bottom:1.5rem;">

            <div class="preview-grid" id="wiz-image-previews">
              ${wizardState.imageFiles.length ? wizardState.imageFiles.map(img => `
                <div style="position:relative;border:1px solid var(--border);border-radius:var(--radius-DEFAULT);overflow:hidden;aspect-ratio:1;">
                  <img src="${img.url}" alt="Preview of ${escapeHTML(img.name)}" style="width:100%;height:100%;object-fit:cover;">
                </div>
              `).join('') : '<p style="color:var(--on-surface-variant);font-size:13px;grid-column:1/-1;">No photos attached yet. You may attach photos or continue without them.</p>'}
            </div>
          `;

        case 5: // Step 6: Service Method
          return `
            <span class="eyebrow">Step 6 of 9</span>
            <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Choose Service Delivery Method</h2>
            <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Choose how you want our engineering team to handle your machine.</p>

            <div class="choice-grid">
              <label class="choice ${wizardState.serviceMethod === 'Free Doorstep Pickup & Drop' ? 'selected' : ''}">
                <input type="radio" name="wizMethod" value="Free Doorstep Pickup & Drop" ${wizardState.serviceMethod === 'Free Doorstep Pickup & Drop' ? 'checked' : ''}>
                <div>
                  <strong>Free Doorstep Pickup & Drop (Delhi NCR)</strong>
                  <p style="margin:0;font-size:12px;color:var(--on-surface-variant);">Safe transit in padded security bag with physical handover receipt. Delivered back after repair approval and QC.</p>
                </div>
              </label>

              <label class="choice ${wizardState.serviceMethod === 'Visit Service Center (Sector 11, Rohini)' ? 'selected' : ''}">
                <input type="radio" name="wizMethod" value="Visit Service Center (Sector 11, Rohini)" ${wizardState.serviceMethod === 'Visit Service Center (Sector 11, Rohini)' ? 'checked' : ''}>
                <div>
                  <strong>Visit Service Center (Sector 11, Rohini)</strong>
                  <p style="margin:0;font-size:12px;color:var(--on-surface-variant);">Visit our Sector 11, Rohini facility for direct bench diagnosis by a chip-level master technician.</p>
                </div>
              </label>

              <label class="choice ${wizardState.serviceMethod === 'On-Site Service Request' ? 'selected' : ''}">
                <input type="radio" name="wizMethod" value="On-Site Service Request" ${wizardState.serviceMethod === 'On-Site Service Request' ? 'checked' : ''}>
                <div>
                  <strong>On-Site Technician Visit (Office / Home)</strong>
                  <p style="margin:0;font-size:12px;color:var(--on-surface-variant);">Available for OS troubleshooting, networking, RAM/SSD upgrades, and printer servicing.</p>
                </div>
              </label>
            </div>
          `;

        case 6: // Step 7: Contact Details
          const c = wizardState.customer;
          return `
            <span class="eyebrow">Step 7 of 9</span>
            <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Contact & Scheduling Details</h2>
            <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Please provide your contact details for technician coordination and SMS/WhatsApp status alerts.</p>

            <div class="form-grid">
              <label class="field">
                <span>Full Name *</span>
                <input type="text" id="wiz-cname" required placeholder="e.g. Priyanka Sen" value="${escapeHTML(c.name)}">
              </label>

              <label class="field">
                <span>Phone Number * (10 Digits)</span>
                <input type="tel" id="wiz-cphone" required placeholder="9876543210" maxlength="10" inputmode="numeric" value="${escapeHTML(c.phone)}">
              </label>

              <label class="field">
                <span>WhatsApp Number</span>
                <input type="tel" id="wiz-cwhatsapp" placeholder="9876543210" maxlength="10" inputmode="numeric" value="${escapeHTML(c.whatsapp)}">
              </label>

              <label class="field">
                <span>Email Address</span>
                <input type="email" id="wiz-cemail" placeholder="priyanka@example.com" value="${escapeHTML(c.email)}">
              </label>

              <label class="field full">
                <span>Address *</span>
                <input type="text" id="wiz-caddress" required placeholder="Flat / Building, Road" value="${escapeHTML(c.address)}">
              </label>

              <label class="field">
                <span>Area / Locality *</span>
                <input type="text" id="wiz-carea" required placeholder="e.g. Connaught Place, Dwarka, Noida" value="${escapeHTML(c.area)}">
              </label>

              <label class="field">
                <span>City *</span>
                <input type="text" id="wiz-ccity" required value="Delhi" placeholder="Delhi">
              </label>

              <label class="field">
                <span>Delhi NCR Pincode *</span>
                <input type="text" id="wiz-cpincode" required placeholder="110001" maxlength="6" inputmode="numeric" value="${escapeHTML(c.pincode)}">
              </label>

              <label class="field">
                <span>Preferred Date *</span>
                <input type="date" id="wiz-cdate" required value="${c.preferredDate}">
              </label>

              <label class="field">
                <span>Preferred Time Slot *</span>
                <select id="wiz-ctime">
                  ${['10:00 AM – 01:00 PM', '01:00 PM – 04:00 PM', '04:00 PM – 07:30 PM'].map(t => `<option value="${t}" ${c.preferredTime === t ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
              </label>
            </div>
          `;

        case 7: // Step 8: Review
          const s = wizardState;
          return `
            <span class="eyebrow green">Step 8 of 9</span>
            <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Review & Confirm Request</h2>
            <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Please review your request summary before generating your service tracking ID.</p>

            <table class="spec-table" style="margin-bottom:1.5rem;">
              <tr><td>Device Type</td><td><strong>${s.device}</strong></td></tr>
              <tr><td>Selected Issue / Service</td><td><strong>${s.problem}</strong></td></tr>
              <tr><td>Device Brand & Model</td><td><strong>${escapeHTML(s.brand)} ${escapeHTML(s.model)}</strong></td></tr>
              <tr><td>Problem Description</td><td>${escapeHTML(s.description)}</td></tr>
              <tr><td>Attached Photos</td><td><strong>${s.imageFiles.length} photo(s) selected locally</strong></td></tr>
              <tr><td>Service Method</td><td><span class="badge badge-blue">${s.serviceMethod}</span></td></tr>
              <tr><td>Customer Name</td><td><strong>${escapeHTML(s.customer.name)}</strong></td></tr>
              <tr><td>Phone Number</td><td><strong>+91 ${escapeHTML(s.customer.phone)}</strong></td></tr>
              <tr><td>Pickup / Service Address</td><td>${escapeHTML(s.customer.address)}, ${escapeHTML(s.customer.area)}, ${escapeHTML(s.customer.city)} - ${escapeHTML(s.customer.pincode)}</td></tr>
              <tr><td>Appointment Slot</td><td><strong>${s.customer.preferredDate} (${s.customer.preferredTime})</strong></td></tr>
            </table>

            <div style="background:var(--surface-container-low);padding:1rem;border-radius:var(--radius-DEFAULT);font-size:13px;color:var(--on-surface);">
              <strong>Bheral Quality Guarantee:</strong>
              No charges apply for standard inspection. A transparent written estimate is shared after diagnosis. Hardware repair only starts once you approve the quote.
            </div>
          `;

        case 8: // Step 9: Confirmed
          return renderConfirmedState();

        default:
          return '';
      }
    }

    function renderConfirmedState() {
      const s = wizardState;
      return `
        <div style="text-align:center;padding:2.5rem 1rem;">
          <div style="width:80px;height:80px;border-radius:50%;background:var(--emerald-soft);color:var(--emerald);display:grid;place-items:center;margin:0 auto 1.5rem;">
            <span class="icon" style="font-size:48px;">check_circle</span>
          </div>
          <span class="badge badge-green" style="font-size:12px;padding:0.35rem 0.75rem;margin-bottom:0.75rem;">Repair Booking Registered</span>
          <h2 style="font-size:2rem;margin-bottom:0.5rem;">Service Request Confirmed!</h2>
          <p style="color:var(--on-surface-variant);max-width:520px;margin:0 auto 1.5rem;">
            Your computer repair request has been logged. Our Rohini coordinator will call <strong>+91 ${s.customer.phone}</strong> to confirm technician dispatch.
          </p>

          <div style="background:var(--surface-container-low);border:1.5px dashed var(--primary);border-radius:var(--radius-lg);padding:1.5rem;max-width:480px;margin:0 auto 2rem;text-align:left;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
              <span style="font-size:12px;text-transform:uppercase;color:var(--on-surface-variant);font-weight:700;">Repair Request ID</span>
              <span class="badge badge-blue">Save this ID</span>
            </div>
            <div style="font-family:var(--font-mono);font-size:1.5rem;font-weight:800;color:var(--primary);letter-spacing:1px;margin-bottom:0.75rem;">
              ${s.id}
            </div>
            <div style="font-size:13px;display:flex;flex-direction:column;gap:0.35rem;color:var(--on-surface);">
              <div><strong>Device:</strong> ${escapeHTML(s.brand)} ${escapeHTML(s.model)} (${s.problem})</div>
              <div><strong>Method:</strong> ${s.serviceMethod}</div>
              <div><strong>Slot:</strong> ${s.customer.preferredDate} (${s.customer.preferredTime})</div>
              <div><strong>Status:</strong> Request Submitted (Pending Technician Allocation)</div>
            </div>
          </div>

          <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
            <a class="btn btn-primary btn-lg" href="track.html?id=${s.id}&phone=${s.customer.phone}">
              <span class="icon">local_shipping</span> Track Repair Timeline
            </a>
            <a class="btn btn-secondary btn-lg" href="index.html">
              <span class="icon">home</span> Return to Home
            </a>
            <a class="btn btn-green btn-lg" href="https://wa.me/919654779949?text=${encodeURIComponent(`Hi Bheral Systems, I booked repair request ${s.id} for my ${s.brand} ${s.model} (${s.problem}). Please assign a technician.`)}" target="_blank" rel="noopener">
              <span class="icon">chat</span> WhatsApp Repair Desk
            </a>
          </div>
        </div>
      `;
    }

    function bindCatalogEvents() {
      // Filter buttons
      document.querySelectorAll('.filter-dev-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeDeviceFilter = btn.dataset.filter;
          document.querySelectorAll('.filter-dev-btn').forEach(b => {
            b.className = `btn ${b.dataset.filter === activeDeviceFilter ? 'btn-primary' : 'btn-secondary'} btn-small filter-dev-btn`;
          });
          const grid = document.getElementById('repair-services-grid');
          if (grid) grid.innerHTML = renderServiceCards();
          bindServiceTriggers();
        });
      });

      bindServiceTriggers();

      // Pincode test checker in banner
      const pinInput = document.getElementById('repair-pincode-test');
      const pinBtn = document.getElementById('repair-pincode-test-btn');
      const pinRes = document.getElementById('repair-pincode-test-result');

      if (pinBtn && pinInput && pinRes) {
        pinBtn.addEventListener('click', () => {
          const pin = pinInput.value.trim();
          if (/^(11\d{4}|201\d{3}|122\d{3})$/.test(pin)) {
            pinRes.innerHTML = `<span style="color:var(--emerald-text);">✓ Pincode ${pin} qualifies for Free 2-Hour Doorstep Pickup!</span>`;
          } else if (/^\d{6}$/.test(pin)) {
            pinRes.innerHTML = `<span style="color:var(--primary);">Pincode ${pin} is serviced via Insured Courier / Center Drop-off.</span>`;
          } else {
            pinRes.innerHTML = `<span style="color:var(--red);">Please enter a valid 6-digit postal pincode.</span>`;
          }
        });
      }
    }

    function bindServiceTriggers() {
      document.querySelectorAll('.book-service-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
          wizardState.problem = trigger.dataset.serviceName;
          wizardState.device = trigger.dataset.serviceDevice;
          currentStep = 1;
          renderPage();
          document.getElementById('book-repair-wizard')?.scrollIntoView({ behavior: 'smooth' });
        });
      });
    }

    function bindWizardEvents() {
      // Step 0: Device radio
      document.querySelectorAll('input[name="wizDevice"]').forEach(radio => {
        radio.addEventListener('change', () => {
          wizardState.device = radio.value;
          currentStep = 1;
          renderWizardStep();
        });
      });

      // Step 1: Problem radio
      document.querySelectorAll('input[name="wizProblem"]').forEach(radio => {
        radio.addEventListener('change', () => {
          wizardState.problem = radio.value;
        });
      });

      // Step 4: Photo file input
      const fileInput = document.getElementById('wiz-file-input');
      if (fileInput) {
        fileInput.addEventListener('change', e => {
          const files = [...e.target.files].slice(0, 4);
          wizardState.imageFiles = files.map(f => ({
            name: f.name,
            url: URL.createObjectURL(f)
          }));
          const prev = document.getElementById('wiz-image-previews');
          if (prev) {
            prev.innerHTML = wizardState.imageFiles.map(img => `
              <div style="position:relative;border:1px solid var(--border);border-radius:var(--radius-DEFAULT);overflow:hidden;aspect-ratio:1;">
                <img src="${img.url}" alt="Preview of ${escapeHTML(img.name)}" style="width:100%;height:100%;object-fit:cover;">
              </div>
            `).join('');
          }
        });
      }

      // Step 5: Method radio
      document.querySelectorAll('input[name="wizMethod"]').forEach(radio => {
        radio.addEventListener('change', () => {
          wizardState.serviceMethod = radio.value;
          document.querySelectorAll('label.choice').forEach(lbl => lbl.classList.remove('selected'));
          radio.closest('label.choice')?.classList.add('selected');
        });
      });

      // Navigation
      const backBtn = document.getElementById('rep-back-btn');
      const nextBtn = document.getElementById('rep-next-btn');

      if (backBtn) {
        backBtn.addEventListener('click', () => {
          if (currentStep > 0) {
            currentStep--;
            renderWizardStep();
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          // Validation per step
          if (currentStep === 2) {
            const brand = document.getElementById('wiz-brand')?.value.trim();
            const model = document.getElementById('wiz-model')?.value.trim();
            if (!brand || !model) {
              toast('Please enter device brand and model', 'error');
              return;
            }
            wizardState.brand = brand;
            wizardState.model = model;
          } else if (currentStep === 3) {
            const desc = document.getElementById('wiz-description')?.value.trim();
            if (!desc) {
              toast('Please describe the problem symptoms', 'error');
              return;
            }
            wizardState.description = desc;
          } else if (currentStep === 6) {
            const name = document.getElementById('wiz-cname')?.value.trim();
            const phone = document.getElementById('wiz-cphone')?.value.trim().replace(/\D/g, '');
            const whatsapp = document.getElementById('wiz-cwhatsapp')?.value.trim().replace(/\D/g, '') || phone;
            const email = document.getElementById('wiz-cemail')?.value.trim() || '';
            const address = document.getElementById('wiz-caddress')?.value.trim();
            const area = document.getElementById('wiz-carea')?.value.trim();
            const city = document.getElementById('wiz-ccity')?.value.trim() || 'Delhi';
            const pincode = document.getElementById('wiz-cpincode')?.value.trim().replace(/\D/g, '');
            const date = document.getElementById('wiz-cdate')?.value;
            const time = document.getElementById('wiz-ctime')?.value;

            if (!name) { toast('Please enter your full name', 'error'); return; }
            if (!/^\d{10}$/.test(phone)) { toast('Please enter a valid 10-digit phone', 'error'); return; }
            if (!address || !area) { toast('Please enter your complete address', 'error'); return; }
            if (!/^\d{6}$/.test(pincode)) { toast('Please enter a valid 6-digit pincode', 'error'); return; }

            wizardState.customer = { name, phone, whatsapp, email, address, area, city, pincode, preferredDate: date, preferredTime: time };
          } else if (currentStep === 7) {
            // Final submission
            submitRepairRequest();
            return;
          }

          currentStep++;
          renderWizardStep();
          document.getElementById('book-repair-wizard')?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    }

    function renderWizardStep() {
      const area = document.getElementById('repair-step-area');
      if (area) area.innerHTML = renderWizardStepContent(currentStep);

      // Update sidebar step indicators
      document.querySelectorAll('.wizard-progress li').forEach((li, idx) => {
        li.className = idx < currentStep ? 'done' : idx === currentStep ? 'active' : '';
        const dot = li.querySelector('.dot');
        if (dot) dot.textContent = idx < currentStep ? '✓' : idx + 1;
      });

      const backBtn = document.getElementById('rep-back-btn');
      const nextBtn = document.getElementById('rep-next-btn');
      if (backBtn) backBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
      if (nextBtn) nextBtn.innerHTML = `${currentStep === 7 ? 'Confirm & Submit Repair Request' : 'Continue'} <span class="icon">arrow_forward</span>`;

      bindWizardEvents();
    }

    function submitRepairRequest() {
      const requestId = uniqueId('BSS-REP');
      wizardState.id = requestId;

      const repairRecord = {
        id: requestId,
        phone: wizardState.customer.phone,
        createdAt: new Date().toISOString(),
        status: 0, // 0: Request Submitted, 1: Pickup Scheduled, 2: Device Received, 3: Diagnosis, 4: Quote Shared, 5: Repair Approved, 6: Repair in Progress, 7: Quality Check, 8: Ready for Delivery, 9: Delivered
        type: 'repair',
        details: {
          device: wizardState.device,
          problem: wizardState.problem,
          brand: wizardState.brand,
          model: wizardState.model,
          description: wizardState.description,
          method: wizardState.serviceMethod,
          imageCount: wizardState.imageFiles.length
        },
        customer: wizardState.customer
      };

      const existingRepairs = safeGet(keys.repairs, []);
      existingRepairs.unshift(repairRecord);
      save(keys.repairs, existingRepairs);

      currentStep = 8;
      const card = document.getElementById('wizard-card-container');
      if (card) {
        card.innerHTML = renderConfirmedState();
      }
      const actions = document.querySelector('.wizard-actions');
      if (actions) actions.style.display = 'none';

      toast('Repair request successfully submitted!', 'success');
      window.scrollTo({ top: container.offsetTop + 100, behavior: 'smooth' });
    }

    renderPage();
  }

  document.addEventListener('DOMContentLoaded', initRepairView);
})();
