/**
 * BHERAL SYSTEMS & SERVICES - SELL & VALUATION WIZARD CONTROLLER
 * Implements the Cashify-inspired multi-step selling flow for Laptops & Computer Parts.
 * Features centralized valuation calculation, condition check questions, doorstep pickup scheduler,
 * and request generation (BSS-SELL-XXXXXX) stored in localStorage.
 */
(() => {
  'use strict';

  function initSellWizard() {
    const container = document.getElementById('sell-page-app');
    if (!container) return;

    const { valuationConfig } = window.BSS_DATA;
    const { safeGet, save, keys, money, escapeHTML, uniqueId, toast } = window.BSS;

    const params = new URLSearchParams(window.location.search);
    const initialCategory = params.get('category') || 'Laptop';

    // State management with localStorage persistence
    const savedState = safeGet(keys.sellProgress, {});
    let state = {
      category: initialCategory,
      brand: savedState.brand || '',
      model: savedState.model || '',
      // Laptop config
      processor: savedState.processor || 'Core i5 / Ryzen 5 (Mainstream)',
      ram: savedState.ram || '8GB',
      storage: savedState.storage || '512GB',
      storageType: savedState.storageType || 'NVMe SSD',
      gpu: savedState.gpu || 'Integrated Graphics',
      screenSize: savedState.screenSize || '14-inch',
      year: savedState.year || '2021-2022',
      // Parts config
      partModel: savedState.partModel || '',
      capacity: savedState.capacity || '512GB',
      interfaceType: savedState.interfaceType || 'NVMe',
      health: savedState.health || '90–100%',
      badSectors: savedState.badSectors || 'No bad sectors',
      generation: savedState.generation || 'DDR4',
      speed: savedState.speed || '3200MHz',
      vram: savedState.vram || '4GB',
      platform: savedState.platform || 'Intel',
      socket: savedState.socket || 'Intel LGA',
      chipset: savedState.chipset || 'Mainstream B-Series',
      printerType: savedState.printerType || 'Laser',
      scanner: savedState.scanner || 'Working',
      monitorSize: savedState.monitorSize || '24-inch',
      resolution: savedState.resolution || 'Full HD (1080p)',
      panel: savedState.panel || 'IPS',
      // Condition questions
      functionalQuestions: savedState.functionalQuestions || {
        powersOn: true,
        displayWorking: true,
        screenDamage: false,
        keyboardWorking: true,
        trackpadWorking: true,
        batteryWorking: true,
        chargingWorking: true,
        chargerAvailable: true,
        wifiWorking: true,
        usbWorking: true,
        bodyDamage: false,
        liquidDamage: false,
        motherboardProblem: false
      },
      cosmeticCondition: savedState.cosmeticCondition || 'Good',
      accessories: savedState.accessories || ['Original Charger', 'Invoice'],
      pickup: savedState.pickup || {}
    };

    // Current wizard step index (0-indexed)
    let currentStep = 0;

    // Steps definition
    const laptopSteps = [
      'Category & Brand',
      'Model & Config',
      'Functional Checks',
      'Cosmetics & Spares',
      'Instant Valuation',
      'Doorstep Pickup'
    ];

    const partSteps = [
      'Category & Brand',
      'Component Details',
      'Condition & Health',
      'Instant Valuation',
      'Doorstep Pickup'
    ];

    const getActiveSteps = () => state.category === 'Laptop' ? laptopSteps : partSteps;

    // Calculate Provisional Valuation based on Centralized Config
    function calculateEstimate() {
      const cfg = valuationConfig;
      let base = cfg.basePrices[state.category] || 15000;
      const brandMul = cfg.brandMultipliers[state.brand] || 1.0;
      let multiplier = brandMul;

      if (state.category === 'Laptop') {
        const procMul = cfg.processorMultipliers[state.processor] || 1.0;
        const ramMul = cfg.ramMultipliers[state.ram] || 1.0;
        const storMul = cfg.storageMultipliers[state.storage] || 1.0;
        const storTypeMul = cfg.storageTypeMultipliers[state.storageType] || 1.0;
        const yearMul = cfg.yearMultipliers[state.year] || 0.65;
        const condMul = cfg.conditionMultipliers[state.cosmeticCondition] || 0.86;

        multiplier *= procMul * ramMul * storMul * storTypeMul * yearMul * condMul;

        // Deductions for non-functional questions
        let penalty = 0;
        const q = state.functionalQuestions;
        if (!q.powersOn) penalty += 0.35;
        if (!q.displayWorking) penalty += 0.25;
        if (q.screenDamage) penalty += 0.20;
        if (!q.keyboardWorking) penalty += 0.08;
        if (!q.trackpadWorking) penalty += 0.05;
        if (!q.batteryWorking) penalty += 0.12;
        if (!q.chargingWorking) penalty += 0.10;
        if (!q.chargerAvailable) penalty += 0.06;
        if (!q.wifiWorking) penalty += 0.05;
        if (!q.usbWorking) penalty += 0.04;
        if (q.bodyDamage) penalty += 0.10;
        if (q.liquidDamage) penalty += 0.25;
        if (q.motherboardProblem) penalty += 0.30;

        multiplier = Math.max(0.12, multiplier * (1 - Math.min(0.85, penalty)));

        // Bonus for accessories
        if (state.accessories.includes('Original Charger')) multiplier *= 1.05;
        if (state.accessories.includes('Box')) multiplier *= 1.03;
        if (state.accessories.includes('Invoice')) multiplier *= 1.04;
      } else {
        // Component-specific valuations
        const condMul = cfg.conditionMultipliers[state.cosmeticCondition] || 0.85;
        const yearMul = cfg.yearMultipliers[state.year] || 0.70;
        multiplier *= condMul * yearMul;

        if (state.category === 'SSD') {
          const cap = cfg.componentRules.SSD.capacity[state.capacity] || 1.0;
          const health = cfg.componentRules.SSD.health[state.health] || 1.0;
          multiplier *= cap * health;
        } else if (state.category === 'HDD') {
          const cap = cfg.componentRules.HDD.capacity[state.capacity] || 1.0;
          const bad = cfg.componentRules.HDD.badSectors[state.badSectors] || 1.0;
          multiplier *= cap * bad;
        } else if (state.category === 'RAM') {
          const cap = cfg.componentRules.RAM.capacity[state.ram] || 1.0;
          const gen = cfg.componentRules.RAM.generation[state.generation] || 1.0;
          multiplier *= cap * gen;
        } else if (state.category === 'GPU') {
          const vram = cfg.componentRules.GPU.vram[state.vram] || 1.0;
          multiplier *= vram;
        }
      }

      const finalEstimate = Math.max(400, Math.round((base * multiplier) / 50) * 50);
      return finalEstimate;
    }

    // Main view renderer
    function renderWizard() {
      const steps = getActiveSteps();
      const estimate = calculateEstimate();

      container.innerHTML = `
        <section class="page-hero">
          <div class="container">
            <div class="breadcrumbs"><a href="index.html">Home</a> <span>/</span> <span>Sell Device</span></div>
            <h1>Sell Used ${escapeHTML(state.category)} for Best Spot Cash</h1>
            <p>Get a transparent, algorithmic demo valuation in minutes. Free doorstep evaluation across Delhi NCR.</p>
          </div>
        </section>

        <section class="section">
          <div class="container">
            <div class="wizard-layout">
              <!-- Left Sidebar: Progress Navigation -->
              <aside class="wizard-side">
                <span class="eyebrow green">Step-by-Step Valuation</span>
                <h2 style="font-size:1.3rem;margin-bottom:1.5rem;">Selling Wizard</h2>
                <ol class="wizard-progress">
                  ${steps.map((label, idx) => `
                    <li class="${idx < currentStep ? 'done' : idx === currentStep ? 'active' : ''}" data-step-nav="${idx}">
                      <span class="dot">${idx < currentStep ? '✓' : idx + 1}</span>
                      <span>${label}</span>
                    </li>
                  `).join('')}
                </ol>

                <div style="margin-top:2rem;padding:1rem;background:var(--surface-container-low);border-radius:var(--radius-DEFAULT);font-size:12px;color:var(--on-surface-variant);display:flex;flex-direction:column;gap:0.75rem;">
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="icon" style="color:var(--emerald-text);font-size:18px;">verified</span>
                    <span>100% Genuine Spot Cash / UPI</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="icon" style="color:var(--primary);font-size:18px;">electric_moped</span>
                    <span>Free Doorstep Pickup in Delhi NCR</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="icon" style="color:var(--tertiary);font-size:18px;">lock_reset</span>
                    <span>DoD Certified Free Data Wiping</span>
                  </div>
                </div>
              </aside>

              <!-- Right: Wizard Card Form -->
              <div class="wizard-card">
                <div id="step-content-area">
                  ${renderStepContent(currentStep, steps, estimate)}
                </div>

                <div class="wizard-actions">
                  <button type="button" class="btn btn-secondary" id="wiz-back-btn" style="${currentStep === 0 ? 'visibility:hidden;' : ''}">
                    <span class="icon">arrow_back</span> Back
                  </button>
                  <button type="button" class="btn btn-primary" id="wiz-next-btn">
                    ${currentStep === steps.length - 1 ? 'Schedule Doorstep Pickup' : 'Continue'} <span class="icon">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;

      bindStepEvents(currentStep, steps, estimate);
    }

    // Step contents router
    function renderStepContent(stepIdx, steps, estimate) {
      if (state.category === 'Laptop') {
        switch (stepIdx) {
          case 0: return renderLaptopStep1();
          case 1: return renderLaptopStep2();
          case 2: return renderLaptopStep3();
          case 3: return renderLaptopStep4();
          case 4: return renderLaptopStep5(estimate);
          case 5: return renderPickupStep(estimate);
          default: return '';
        }
      } else {
        switch (stepIdx) {
          case 0: return renderPartStep1();
          case 1: return renderPartStep2();
          case 2: return renderPartStep3();
          case 3: return renderLaptopStep5(estimate);
          case 4: return renderPickupStep(estimate);
          default: return '';
        }
      }
    }

    // ------------------------------------------------------------------------
    // LAPTOP STEPS
    // ------------------------------------------------------------------------
    function renderLaptopStep1() {
      const categories = ['Laptop', 'Desktop', 'Monitor', 'Printer', 'SSD', 'HDD', 'RAM', 'GPU', 'Processor', 'Motherboard'];
      const brands = ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'MSI', 'Other'];

      return `
        <span class="eyebrow">Step 1 of 6</span>
        <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Select Device & Brand</h2>
        <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Choose the device type and manufacture brand of the laptop you wish to sell.</p>

        <h3 style="font-size:14px;text-transform:uppercase;color:var(--on-surface-variant);margin-bottom:0.75rem;">Device Type</h3>
        <div class="option-grid" style="margin-bottom:2rem;">
          ${categories.map((cat, i) => `
            <label class="option ${state.category === cat ? 'selected' : ''}">
              <input type="radio" name="sellCategory" value="${cat}" ${state.category === cat ? 'checked' : ''}>
              <span class="icon">${['laptop', 'desktop_windows', 'tv', 'print', 'hard_drive', 'album', 'developer_board', 'memory', 'stream_apps', 'check_indeterminate_small'][i]}</span>
              <strong>${cat}</strong>
            </label>
          `).join('')}
        </div>

        <h3 style="font-size:14px;text-transform:uppercase;color:var(--on-surface-variant);margin-bottom:0.75rem;">Select Laptop Brand</h3>
        <div class="option-grid" style="grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));">
          ${brands.map(brand => {
            const logoMap = {
              'Apple': { src: 'assets/images/brands/apple.svg', h: 26 },
              'Dell': { src: 'assets/images/brands/dell.svg', h: 28 },
              'HP': { src: 'assets/images/brands/hp.svg', h: 26 },
              'Lenovo': { src: 'assets/images/brands/lenovo.svg', h: 18 },
              'ASUS': { src: 'assets/images/brands/asus.svg', h: 16 },
              'Acer': { src: 'assets/images/brands/acer.svg', h: 18 },
              'MSI': { src: 'assets/images/brands/msi.svg', h: 16 },
              'Samsung': { src: 'assets/images/brands/samsung.svg', h: 15 },
            };
            const item = logoMap[brand];
            return `
            <label class="option ${state.brand === brand ? 'selected' : ''}" style="min-height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:0.75rem 0.5rem;">
              <input type="radio" name="sellBrand" value="${brand}" ${state.brand === brand ? 'checked' : ''}>
              ${item ? `<img src="${item.src}" alt="${brand}" style="height:${item.h}px;max-width:85px;object-fit:contain;"><strong style="font-size:12px;color:var(--on-surface-variant);">${brand}</strong>` : `<span class="icon" style="font-size:24px;color:var(--primary);">devices</span><strong>${brand}</strong>`}
            </label>
          `;}).join('')}
        </div>
      `;
    }

    function renderLaptopStep2() {
      const processors = [
        'Apple M-series (M1/M2/M3)',
        'Core i7 / Ryzen 7 (High End)',
        'Core i5 / Ryzen 5 (Mainstream)',
        'Core i3 / Ryzen 3 (Entry)',
        'Intel Core i9 / Ryzen 9',
        'Other / Older Dual-Core'
      ];
      const rams = ['4GB', '8GB', '16GB', '32GB+'];
      const storages = ['128GB', '256GB', '512GB', '1TB+'];
      const storageTypes = ['NVMe SSD', 'SATA SSD', 'SSD + HDD', 'HDD Only'];
      const screenSizes = ['13.3-inch', '14-inch', '15.6-inch', '16-inch or larger'];
      const years = ['2025-2026', '2023-2024', '2021-2022', '2019-2020', 'Before 2019'];

      return `
        <span class="eyebrow">Step 2 of 6</span>
        <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Model & Hardware Configuration</h2>
        <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Enter the model name or series (e.g. ThinkPad T480, Dell XPS 13, MacBook Air) and installed specifications.</p>

        <div class="form-grid">
          <label class="field full">
            <span>Laptop Model / Series Name *</span>
            <input type="text" id="sell-model" placeholder="e.g. ThinkPad T14 Gen 2 / MacBook Air M1 / Latitude 7400" value="${escapeHTML(state.model)}" required>
          </label>

          <label class="field">
            <span>Processor Family *</span>
            <select id="sell-processor">
              ${processors.map(p => `<option value="${p}" ${state.processor === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </label>

          <label class="field">
            <span>Installed RAM Memory *</span>
            <select id="sell-ram">
              ${rams.map(r => `<option value="${r}" ${state.ram === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </label>

          <label class="field">
            <span>Storage Capacity *</span>
            <select id="sell-storage">
              ${storages.map(s => `<option value="${s}" ${state.storage === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </label>

          <label class="field">
            <span>Storage Drive Type *</span>
            <select id="sell-storageType">
              ${storageTypes.map(st => `<option value="${st}" ${state.storageType === st ? 'selected' : ''}>${st}</option>`).join('')}
            </select>
          </label>

          <label class="field">
            <span>Screen Size</span>
            <select id="sell-screenSize">
              ${screenSizes.map(sz => `<option value="${sz}" ${state.screenSize === sz ? 'selected' : ''}>${sz}</option>`).join('')}
            </select>
          </label>

          <label class="field">
            <span>Approximate Purchase Year</span>
            <select id="sell-year">
              ${years.map(y => `<option value="${y}" ${state.year === y ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </label>
        </div>
      `;
    }

    function renderLaptopStep3() {
      const q = state.functionalQuestions;
      const questionItems = [
        { key: 'powersOn', label: 'Does the laptop switch on / power up properly?', positive: true },
        { key: 'displayWorking', label: 'Is the display screen completely working with no lines?', positive: true },
        { key: 'screenDamage', label: 'Are there cracks, dead pixels, or glass damage on screen?', positive: false },
        { key: 'keyboardWorking', label: 'Do all keyboard keys function smoothly?', positive: true },
        { key: 'trackpadWorking', label: 'Is the trackpad & touch gestures working?', positive: true },
        { key: 'batteryWorking', label: 'Does the laptop battery hold charge (minimum 1.5–2 hours)?', positive: true },
        { key: 'chargingWorking', label: 'Does the charging port work without loose connection?', positive: true },
        { key: 'chargerAvailable', label: 'Do you have the original power adapter / charger available?', positive: true },
        { key: 'wifiWorking', label: 'Are Wi-Fi and Bluetooth wireless working?', positive: true },
        { key: 'usbWorking', label: 'Are USB / Type-C ports functioning properly?', positive: true },
        { key: 'bodyDamage', label: 'Are there broken hinges, body cracks, or severe dents?', positive: false },
        { key: 'liquidDamage', label: 'Has the laptop ever suffered liquid or water spill?', positive: false },
        { key: 'motherboardProblem', label: 'Has there been any motherboard heating or previous chip repair?', positive: false }
      ];

      return `
        <span class="eyebrow">Step 3 of 6</span>
        <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Functional Condition Questions</h2>
        <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Answer accurately to ensure your doorstep evaluation matches your online estimate.</p>

        <div class="question-list">
          ${questionItems.map(item => {
            const isChecked = q[item.key];
            return `
              <div class="question" style="display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1rem;border:1px solid var(--border);border-radius:var(--radius-DEFAULT);margin-bottom:0.5rem;">
                <span style="font-weight:600;font-size:14px;color:var(--on-surface);">${item.label}</span>
                <div style="display:flex;gap:0.75rem;">
                  <label class="choice" style="margin:0;padding:0.35rem 0.75rem;font-size:13px;border-radius:var(--radius-DEFAULT);">
                    <input type="radio" name="q_${item.key}" value="yes" ${isChecked ? 'checked' : ''}> Yes
                  </label>
                  <label class="choice" style="margin:0;padding:0.35rem 0.75rem;font-size:13px;border-radius:var(--radius-DEFAULT);">
                    <input type="radio" name="q_${item.key}" value="no" ${!isChecked ? 'checked' : ''}> No
                  </label>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    function renderLaptopStep4() {
      const cosmetics = [
        { value: 'Excellent', label: 'Excellent (Like New)', desc: 'Flawless body, zero visible scratches or paint peel. Pristine condition.' },
        { value: 'Good', label: 'Good (Minor Scratches)', desc: 'Normal light signs of office use. No cracks or broken parts.' },
        { value: 'Fair', label: 'Fair (Noticeable Wear)', desc: 'Visible scuffs, corner rub marks, or minor chassis wear.' },
        { value: 'Poor', label: 'Poor (Heavy Wear)', desc: 'Deep scratches, loose rubber pads, or noticeable dents.' },
        { value: 'Damaged', label: 'Damaged / Broken Part', desc: 'Cracked plastic, broken casing, or damaged hinges.' }
      ];

      const accList = ['Original Charger', 'Box', 'Invoice', 'Laptop Bag', 'Wireless Mouse'];

      return `
        <span class="eyebrow">Step 4 of 6</span>
        <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Cosmetic Condition & Accessories</h2>
        <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Select the physical appearance rating and any included original accessories.</p>

        <h3 style="font-size:14px;text-transform:uppercase;color:var(--on-surface-variant);margin-bottom:0.75rem;">Cosmetic Grade</h3>
        <div class="choice-grid" style="margin-bottom:2rem;">
          ${cosmetics.map(c => `
            <label class="choice ${state.cosmeticCondition === c.value ? 'selected' : ''}">
              <input type="radio" name="cosmeticGrade" value="${c.value}" ${state.cosmeticCondition === c.value ? 'checked' : ''}>
              <div>
                <strong>${c.label}</strong>
                <p style="margin:0;font-size:12px;color:var(--on-surface-variant);">${c.desc}</p>
              </div>
            </label>
          `).join('')}
        </div>

        <h3 style="font-size:14px;text-transform:uppercase;color:var(--on-surface-variant);margin-bottom:0.75rem;">Available Accessories (Increases Value)</h3>
        <div class="option-grid" style="grid-template-columns:repeat(auto-fill, minmax(150px, 1fr));">
          ${accList.map(acc => `
            <label class="option ${state.accessories.includes(acc) ? 'selected' : ''}">
              <input type="checkbox" name="accessory" value="${acc}" ${state.accessories.includes(acc) ? 'checked' : ''}>
              <span class="icon">check_circle</span>
              <strong>${acc}</strong>
            </label>
          `).join('')}
        </div>
      `;
    }

    // ------------------------------------------------------------------------
    // PARTS STEPS
    // ------------------------------------------------------------------------
    function renderPartStep1() {
      const categories = ['SSD', 'HDD', 'RAM', 'GPU', 'Processor', 'Motherboard', 'Monitor', 'Printer'];
      const brands = ['Samsung', 'Crucial', 'Kingston', 'Western Digital', 'Seagate', 'Corsair', 'Intel', 'AMD', 'ASUS', 'HP', 'Dell', 'Other'];

      return `
        <span class="eyebrow">Step 1 of 5</span>
        <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Component Type & Brand</h2>
        <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Select the computer component category and brand you wish to liquidate.</p>

        <div class="option-grid" style="margin-bottom:2rem;">
          ${categories.map(cat => `
            <label class="option ${state.category === cat ? 'selected' : ''}">
              <input type="radio" name="sellCategory" value="${cat}" ${state.category === cat ? 'checked' : ''}>
              <span class="icon">memory</span>
              <strong>${cat}</strong>
            </label>
          `).join('')}
        </div>

        <h3 style="font-size:14px;text-transform:uppercase;color:var(--on-surface-variant);margin-bottom:0.75rem;">Manufacturer Brand</h3>
        <div class="option-grid" style="grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));">
          ${brands.map(brand => {
            const logoMap = {
              'Samsung': { src: 'assets/images/brands/samsung.svg', h: 15 },
              'ASUS': { src: 'assets/images/brands/asus.svg', h: 16 },
              'HP': { src: 'assets/images/brands/hp.svg', h: 26 },
              'Dell': { src: 'assets/images/brands/dell.svg', h: 28 },
              'Apple': { src: 'assets/images/brands/apple.svg', h: 26 },
              'Lenovo': { src: 'assets/images/brands/lenovo.svg', h: 18 },
            };
            const item = logoMap[brand];
            return `
            <label class="option ${state.brand === brand ? 'selected' : ''}" style="min-height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:0.75rem 0.5rem;">
              <input type="radio" name="sellBrand" value="${brand}" ${state.brand === brand ? 'checked' : ''}>
              ${item ? `<img src="${item.src}" alt="${brand}" style="height:${item.h}px;max-width:85px;object-fit:contain;"><strong style="font-size:12px;color:var(--on-surface-variant);">${brand}</strong>` : `<span class="icon" style="font-size:24px;color:var(--primary);">memory</span><strong>${brand}</strong>`}
            </label>
          `;}).join('')}
        </div>
      `;
    }

    function renderPartStep2() {
      const cat = state.category;
      let fieldsHtml = '';

      if (cat === 'SSD') {
        fieldsHtml = `
          <label class="field">
            <span>Capacity *</span>
            <select id="part-capacity">
              ${['128GB', '256GB', '512GB', '1TB+'].map(c => `<option value="${c}" ${state.capacity === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Interface *</span>
            <select id="part-interface">
              ${['NVMe', 'SATA'].map(i => `<option value="${i}" ${state.interfaceType === i ? 'selected' : ''}>${i}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Reported Health (SMART) *</span>
            <select id="part-health">
              ${['90–100%', '70–89%', 'Below 70%'].map(h => `<option value="${h}" ${state.health === h ? 'selected' : ''}>${h}</option>`).join('')}
            </select>
          </label>
        `;
      } else if (cat === 'HDD') {
        fieldsHtml = `
          <label class="field">
            <span>Capacity *</span>
            <select id="part-capacity">
              ${['500GB', '1TB', '2TB+'].map(c => `<option value="${c}" ${state.capacity === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Bad Sector Status *</span>
            <select id="part-badSectors">
              ${['No bad sectors', 'Minor bad sectors', 'Clicking/Dead'].map(b => `<option value="${b}" ${state.badSectors === b ? 'selected' : ''}>${b}</option>`).join('')}
            </select>
          </label>
        `;
      } else if (cat === 'RAM') {
        fieldsHtml = `
          <label class="field">
            <span>Capacity *</span>
            <select id="part-ram">
              ${['4GB', '8GB', '16GB', '32GB+'].map(r => `<option value="${r}" ${state.ram === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>DDR Generation *</span>
            <select id="part-generation">
              ${['DDR3', 'DDR4', 'DDR5'].map(g => `<option value="${g}" ${state.generation === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Speed (MHz)</span>
            <select id="part-speed">
              ${['1600MHz', '2666MHz', '3200MHz', '4800MHz+'].map(s => `<option value="${s}" ${state.speed === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </label>
        `;
      } else if (cat === 'GPU') {
        fieldsHtml = `
          <label class="field">
            <span>VRAM Capacity *</span>
            <select id="part-vram">
              ${['2GB', '4GB', '6GB/8GB', '10GB+'].map(v => `<option value="${v}" ${state.vram === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Graphics Card Model / Series</span>
            <input type="text" id="part-model" placeholder="e.g. GTX 1650 / RTX 3060 / Radeon RX 580" value="${escapeHTML(state.partModel)}">
          </label>
        `;
      } else if (cat === 'Processor') {
        fieldsHtml = `
          <label class="field">
            <span>Platform *</span>
            <select id="part-platform">
              ${['Intel', 'AMD'].map(p => `<option value="${p}" ${state.platform === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Exact Processor Model</span>
            <input type="text" id="part-model" placeholder="e.g. Core i7-10700K / Ryzen 5 5600X" value="${escapeHTML(state.partModel)}">
          </label>
        `;
      } else if (cat === 'Motherboard') {
        fieldsHtml = `
          <label class="field">
            <span>Socket *</span>
            <select id="part-socket">
              ${['Intel LGA 1200 / 1700', 'AMD AM4', 'AMD AM5', 'Other'].map(s => `<option value="${s}" ${state.socket === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Chipset *</span>
            <select id="part-chipset">
              ${['Entry H-Series / A-Series', 'Mainstream B-Series', 'Performance Z-Series / X-Series'].map(c => `<option value="${c}" ${state.chipset === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </label>
        `;
      } else if (cat === 'Printer') {
        fieldsHtml = `
          <label class="field">
            <span>Printer Type *</span>
            <select id="part-printerType">
              ${['Laser', 'Ink Tank', 'All-in-One Multifunction'].map(t => `<option value="${t}" ${state.printerType === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Scanner Condition</span>
            <select id="part-scanner">
              ${['Working', 'Defective', 'No Scanner (Single Function)'].map(s => `<option value="${s}" ${state.scanner === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </label>
        `;
      } else if (cat === 'Monitor') {
        fieldsHtml = `
          <label class="field">
            <span>Screen Size *</span>
            <select id="part-monitorSize">
              ${['19-inch to 22-inch', '24-inch', '27-inch', '32-inch+'].map(sz => `<option value="${sz}" ${state.monitorSize === sz ? 'selected' : ''}>${sz}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Resolution *</span>
            <select id="part-resolution">
              ${['HD (720p)', 'Full HD (1080p)', '2K QHD', '4K Ultra HD'].map(r => `<option value="${r}" ${state.resolution === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Panel Type</span>
            <select id="part-panel">
              ${['IPS', 'VA', 'TN'].map(p => `<option value="${p}" ${state.panel === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </label>
        `;
      }

      return `
        <span class="eyebrow">Step 2 of 5</span>
        <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">${escapeHTML(state.category)} Specifications</h2>
        <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Provide the exact hardware metrics for your ${escapeHTML(state.category)}.</p>

        <div class="form-grid">
          ${fieldsHtml}
          <label class="field">
            <span>Approximate Age / Purchase Year</span>
            <select id="sell-year">
              ${['2025-2026', '2023-2024', '2021-2022', '2019-2020', 'Before 2019'].map(y => `<option value="${y}" ${state.year === y ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </label>
        </div>
      `;
    }

    function renderPartStep3() {
      const cosmetics = [
        { value: 'Excellent', label: 'Fully Working & Tested', desc: 'No faults, clean board, flawless operation in testing.' },
        { value: 'Good', label: 'Normal Working Order', desc: 'Tested working with standard cosmetic signs of installation.' },
        { value: 'Fair', label: 'Intermittent / Minor Issues', desc: 'Works but occasional detection delays or high temperatures.' },
        { value: 'Damaged', label: 'Dead / Non-Functional', desc: 'No display, dead chip, or physical damage (scrap salvage).' }
      ];

      return `
        <span class="eyebrow">Step 3 of 5</span>
        <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Working Condition & Status</h2>
        <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Select the operating reliability status of the component.</p>

        <div class="choice-grid">
          ${cosmetics.map(c => `
            <label class="choice ${state.cosmeticCondition === c.value ? 'selected' : ''}">
              <input type="radio" name="cosmeticGrade" value="${c.value}" ${state.cosmeticCondition === c.value ? 'checked' : ''}>
              <div>
                <strong>${c.label}</strong>
                <p style="margin:0;font-size:12px;color:var(--on-surface-variant);">${c.desc}</p>
              </div>
            </label>
          `).join('')}
        </div>
      `;
    }

    // ------------------------------------------------------------------------
    // VALUATION & PICKUP STEPS
    // ------------------------------------------------------------------------
    function renderLaptopStep5(estimate) {
      const minRange = Math.round(estimate * 0.92);
      const maxRange = Math.round(estimate * 1.08);

      return `
        <span class="eyebrow green">Instant Algorithmic Valuation</span>
        <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Provisional Estimated Value</h2>
        <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Calculated based on Delhi NCR wholesale re-commerce indices and your declared specifications.</p>

        <div class="estimate" style="text-align:center;padding:2.5rem 1.5rem;background:var(--surface-container-low);border:2px solid var(--emerald);border-radius:var(--radius-xl);margin-bottom:2rem;">
          <span style="font-size:13px;text-transform:uppercase;color:var(--tertiary);font-weight:700;letter-spacing:1px;">Estimated Payout Value</span>
          <div class="estimate-value" style="font-size:3rem;font-weight:800;color:var(--primary);margin:0.5rem 0;">
            ${money(estimate)}
          </div>
          <p style="font-size:14px;color:var(--on-surface-variant);margin-bottom:1rem;">
            Estimated Range: <strong>${money(minRange)} – ${money(maxRange)}</strong> (Spot UPI / Cash)
          </p>
          <div style="background:var(--surface-container-lowest);padding:0.75rem 1rem;border-radius:var(--radius-DEFAULT);display:inline-block;font-size:12px;color:var(--navy);font-weight:600;">
            ⚠️ Final value is subject to physical inspection and hardware verification by our visiting technician.
          </div>
        </div>

        <div class="highlight-specs" style="margin-bottom:1.5rem;">
          <div class="highlight-spec">
            <small>Item</small>
            <strong>${escapeHTML(state.brand)} ${escapeHTML(state.model || state.partModel || state.category)}</strong>
          </div>
          <div class="highlight-spec">
            <small>Declared Condition</small>
            <strong>${state.cosmeticCondition}</strong>
          </div>
          <div class="highlight-spec">
            <small>Storage / RAM</small>
            <strong>${state.storage || state.capacity || '—'} / ${state.ram || '—'}</strong>
          </div>
          <div class="highlight-spec">
            <small>Payment Method</small>
            <strong>Instant UPI / Spot Cash</strong>
          </div>
        </div>
      `;
    }

    function renderPickupStep(estimate) {
      return `
        <span class="eyebrow">Final Step</span>
        <h2 style="font-size:1.6rem;margin-bottom:0.5rem;">Schedule Doorstep Inspection & Pickup</h2>
        <p style="color:var(--on-surface-variant);margin-bottom:1.5rem;">Our Delhi technician will visit your location to inspect the device, confirm the final valuation, and transfer instant cash/UPI.</p>

        <form id="sell-pickup-form" novalidate>
          <div class="form-grid">
            <label class="field">
              <span>Full Name *</span>
              <input type="text" id="sell-name" required placeholder="e.g. Vikram Mehra" value="${escapeHTML(state.pickup.name || '')}">
            </label>

            <label class="field">
              <span>Mobile Phone * (10 Digits)</span>
              <input type="tel" id="sell-phone" required placeholder="9876543210" maxlength="10" inputmode="numeric" value="${escapeHTML(state.pickup.phone || '')}">
            </label>

            <label class="field">
              <span>WhatsApp Number (For Updates)</span>
              <input type="tel" id="sell-whatsapp" placeholder="9876543210" maxlength="10" inputmode="numeric" value="${escapeHTML(state.pickup.whatsapp || '')}">
            </label>

            <label class="field">
              <span>Email Address</span>
              <input type="email" id="sell-email" placeholder="vikram@example.com" value="${escapeHTML(state.pickup.email || '')}">
            </label>

            <label class="field full">
              <span>Pickup Street Address *</span>
              <input type="text" id="sell-address" required placeholder="House/Flat No., Street, Building" value="${escapeHTML(state.pickup.address || '')}">
            </label>

            <label class="field">
              <span>Area / Locality *</span>
              <input type="text" id="sell-area" required placeholder="e.g. Lajpat Nagar, Rohini, Saket" value="${escapeHTML(state.pickup.area || '')}">
            </label>

            <label class="field">
              <span>City *</span>
              <input type="text" id="sell-city" required value="Delhi" placeholder="Delhi">
            </label>

            <label class="field">
              <span>Delhi NCR Pincode *</span>
              <input type="text" id="sell-pincode" required placeholder="110024" maxlength="6" inputmode="numeric" value="${escapeHTML(state.pickup.pincode || '')}">
            </label>

            <label class="field">
              <span>Preferred Inspection Date *</span>
              <input type="date" id="sell-date" required value="${state.pickup.date || new Date(Date.now() + 86400000).toISOString().split('T')[0]}">
            </label>

            <label class="field">
              <span>Preferred Time Slot *</span>
              <select id="sell-time">
                ${['10:00 AM – 01:00 PM (Morning)', '01:00 PM – 04:00 PM (Afternoon)', '04:00 PM – 07:30 PM (Evening)'].map(t => `<option value="${t}" ${state.pickup.time === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </label>

            <label class="field full">
              <span>Special Instructions / Landmark</span>
              <textarea id="sell-instructions" placeholder="Near metro station, call before arrival, etc.">${escapeHTML(state.pickup.instructions || '')}</textarea>
            </label>
          </div>
        </form>
      `;
    }

    // Bind event handlers for inputs on current step
    function bindStepEvents(stepIdx, steps, estimate) {
      // Category switcher
      document.querySelectorAll('input[name="sellCategory"]').forEach(radio => {
        radio.addEventListener('change', () => {
          state.category = radio.value;
          state.brand = '';
          state.model = '';
          currentStep = 0;
          save(keys.sellProgress, state);
          renderWizard();
        });
      });

      // Brand switcher
      document.querySelectorAll('input[name="sellBrand"]').forEach(radio => {
        radio.addEventListener('change', () => {
          state.brand = radio.value;
          save(keys.sellProgress, state);
          renderWizard();
        });
      });

      // Model input
      const modelEl = document.getElementById('sell-model');
      if (modelEl) modelEl.addEventListener('input', () => { state.model = modelEl.value.trim(); save(keys.sellProgress, state); });

      // Config selects
      ['processor', 'ram', 'storage', 'storageType', 'screenSize', 'year'].forEach(field => {
        const el = document.getElementById(`sell-${field}`);
        if (el) el.addEventListener('change', () => { state[field] = el.value; save(keys.sellProgress, state); });
      });

      // Parts selects
      ['capacity', 'interface', 'health', 'badSectors', 'ram', 'generation', 'speed', 'vram', 'platform', 'socket', 'chipset', 'printerType', 'scanner', 'monitorSize', 'resolution', 'panel'].forEach(field => {
        const el = document.getElementById(`part-${field}`);
        if (el) el.addEventListener('change', () => {
          if (field === 'interface') state.interfaceType = el.value;
          else state[field] = el.value;
          save(keys.sellProgress, state);
        });
      });

      const partModelEl = document.getElementById('part-model');
      if (partModelEl) partModelEl.addEventListener('input', () => { state.partModel = partModelEl.value.trim(); save(keys.sellProgress, state); });

      // Questions radio buttons
      Object.keys(state.functionalQuestions).forEach(key => {
        document.querySelectorAll(`input[name="q_${key}"]`).forEach(radio => {
          radio.addEventListener('change', () => {
            state.functionalQuestions[key] = radio.value === 'yes';
            save(keys.sellProgress, state);
          });
        });
      });

      // Cosmetic grade radios
      document.querySelectorAll('input[name="cosmeticGrade"]').forEach(radio => {
        radio.addEventListener('change', () => {
          state.cosmeticCondition = radio.value;
          save(keys.sellProgress, state);
          renderWizard();
        });
      });

      // Accessories checkboxes
      document.querySelectorAll('input[name="accessory"]').forEach(chk => {
        chk.addEventListener('change', () => {
          const checked = [...document.querySelectorAll('input[name="accessory"]:checked')].map(c => c.value);
          state.accessories = checked;
          save(keys.sellProgress, state);
        });
      });

      // Navigation buttons
      const backBtn = document.getElementById('wiz-back-btn');
      const nextBtn = document.getElementById('wiz-next-btn');

      if (backBtn) {
        backBtn.addEventListener('click', () => {
          if (currentStep > 0) {
            currentStep--;
            renderWizard();
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          // Validation per step
          if (currentStep === 0) {
            if (!state.brand) {
              toast('Please select the manufacturer brand', 'error');
              return;
            }
          } else if (currentStep === 1 && state.category === 'Laptop') {
            if (!state.model) {
              toast('Please enter the laptop model name', 'error');
              document.getElementById('sell-model')?.focus();
              return;
            }
          } else if (currentStep === steps.length - 1) {
            // Final submission
            submitSellRequest(estimate);
            return;
          }

          currentStep++;
          renderWizard();
          window.scrollTo({ top: container.offsetTop - 40, behavior: 'smooth' });
        });
      }
    }

    function submitSellRequest(estimate) {
      const name = document.getElementById('sell-name')?.value.trim();
      const phone = document.getElementById('sell-phone')?.value.trim().replace(/\D/g, '');
      const whatsapp = document.getElementById('sell-whatsapp')?.value.trim().replace(/\D/g, '') || phone;
      const email = document.getElementById('sell-email')?.value.trim() || '';
      const address = document.getElementById('sell-address')?.value.trim();
      const area = document.getElementById('sell-area')?.value.trim();
      const city = document.getElementById('sell-city')?.value.trim() || 'Delhi';
      const pincode = document.getElementById('sell-pincode')?.value.trim().replace(/\D/g, '');
      const date = document.getElementById('sell-date')?.value;
      const time = document.getElementById('sell-time')?.value;
      const instructions = document.getElementById('sell-instructions')?.value.trim();

      if (!name) {
        toast('Please enter your full name', 'error');
        document.getElementById('sell-name')?.focus();
        return;
      }

      if (!/^\d{10}$/.test(phone)) {
        toast('Please enter a valid 10-digit mobile number', 'error');
        document.getElementById('sell-phone')?.focus();
        return;
      }

      if (!address || !area) {
        toast('Please enter your complete doorstep pickup address', 'error');
        return;
      }

      if (!/^\d{6}$/.test(pincode)) {
        toast('Please enter a valid 6-digit postal pincode', 'error');
        document.getElementById('sell-pincode')?.focus();
        return;
      }

      const requestId = uniqueId('BSS-SELL');
      const sellRecord = {
        id: requestId,
        phone,
        createdAt: new Date().toISOString(),
        status: 0, // 0: Request Submitted, 1: Pickup Scheduled, 2: Inspection, 3: Final Value Confirmed, 4: Payment Processing, 5: Completed
        type: 'sell',
        device: {
          category: state.category,
          brand: state.brand,
          model: state.model || state.partModel || state.category,
          processor: state.processor,
          ram: state.ram,
          storage: state.storage || state.capacity,
          condition: state.cosmeticCondition,
          estimate
        },
        customer: {
          name,
          phone,
          whatsapp,
          email,
          address: `${address}, ${area}`,
          city,
          pincode,
          preferredDate: date,
          preferredTime: time,
          instructions
        }
      };

      const existingSells = safeGet(keys.sells, []);
      existingSells.unshift(sellRecord);
      save(keys.sells, existingSells);

      // Clear progress
      localStorage.removeItem(keys.sellProgress);

      renderSellConfirmation(sellRecord);
    }

    function renderSellConfirmation(record) {
      container.innerHTML = `
        <section class="section">
          <div class="container" style="max-width:800px;">
            <div class="cart-card" style="text-align:center;padding:3rem 2rem;">
              <div style="width:80px;height:80px;border-radius:50%;background:var(--emerald-soft);color:var(--emerald);display:grid;place-items:center;margin:0 auto 1.5rem;">
                <span class="icon" style="font-size:48px;">check_circle</span>
              </div>
              <span class="badge badge-green" style="font-size:12px;padding:0.35rem 0.75rem;margin-bottom:0.75rem;">Sell Request Registered</span>
              <h1 style="font-size:2rem;margin-bottom:0.5rem;">Doorstep Inspection Scheduled!</h1>
              <p style="color:var(--on-surface-variant);max-width:520px;margin:0 auto 1.5rem;">
                Your valuation and doorstep request has been saved. Our Delhi pickup representative will call <strong>+91 ${record.phone}</strong> to confirm technician arrival.
              </p>

              <div style="background:var(--surface-container-low);border:1.5px dashed var(--tertiary);border-radius:var(--radius-lg);padding:1.5rem;max-width:480px;margin:0 auto 2rem;text-align:left;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                  <span style="font-size:12px;text-transform:uppercase;color:var(--on-surface-variant);font-weight:700;">Sell Request ID</span>
                  <span class="badge badge-green">Save this ID</span>
                </div>
                <div style="font-family:var(--font-mono);font-size:1.5rem;font-weight:800;color:var(--tertiary);letter-spacing:1px;margin-bottom:0.75rem;">
                  ${record.id}
                </div>
                <div style="font-size:13px;display:flex;flex-direction:column;gap:0.35rem;color:var(--on-surface);">
                  <div><strong>Device:</strong> ${escapeHTML(record.device.brand)} ${escapeHTML(record.device.model)}</div>
                  <div><strong>Provisional Estimate:</strong> ${money(record.device.estimate)} (Subject to verification)</div>
                  <div><strong>Pickup Scheduled:</strong> ${record.customer.preferredDate} (${record.customer.preferredTime})</div>
                  <div><strong>Pickup Address:</strong> ${escapeHTML(record.customer.address)}, ${record.customer.city} - ${record.customer.pincode}</div>
                </div>
              </div>

              <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                <a class="btn btn-primary btn-lg" href="track.html?id=${record.id}&phone=${record.phone}">
                  <span class="icon">local_shipping</span> Track Inspection Status
                </a>
                <a class="btn btn-secondary btn-lg" href="index.html">
                  <span class="icon">home</span> Return to Home
                </a>
                <a class="btn btn-green btn-lg" href="https://wa.me/919654779949?text=${encodeURIComponent(`Hi Bheral Systems, I scheduled selling request ${record.id} for my ${record.device.brand} ${record.device.model}. Provisional value: ${money(record.device.estimate)}. Please confirm technician slot.`)}" target="_blank" rel="noopener">
                  <span class="icon">chat</span> WhatsApp Selling Desk
                </a>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    renderWizard();
  }

  document.addEventListener('DOMContentLoaded', initSellWizard);
})();
