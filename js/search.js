/**
 * BHERAL SYSTEMS & SERVICES - GLOBAL SEARCH ENGINE
 * Implements real-time search across products and repair services with category scoping,
 * autocomplete preview thumbnails, and full keyboard accessibility.
 */
(() => {
  'use strict';

  function initGlobalSearch() {
    const input = document.getElementById('global-search');
    const btn = document.getElementById('global-search-btn');
    const catSelect = document.getElementById('search-cat-scope');
    const suggestions = document.getElementById('search-suggestions');

    if (!input || !suggestions) return;

    const { products, repairs } = window.BSS_DATA;
    const { escapeHTML, money } = window.BSS;
    let activeIndex = -1;

    // Searchable corpus combining products and repair services
    const searchableServices = repairs.map(srv => ({
      id: srv.id,
      name: srv.name,
      category: 'Repair Service',
      description: srv.description,
      icon: srv.icon,
      url: `repair.html?service=${encodeURIComponent(srv.name)}`,
      isService: true
    }));

    function getMatches(query, categoryScope = 'all') {
      const q = query.trim().toLowerCase();
      if (!q) return [];

      let combined = [
        ...products.map(p => ({
          ...p,
          url: `product.html?id=${p.id}`,
          isService: false
        })),
        ...searchableServices
      ];

      // Apply category scoping if selected
      if (categoryScope && categoryScope !== 'all') {
        if (categoryScope === 'Repair') {
          combined = combined.filter(item => item.isService);
        } else if (categoryScope === 'Parts') {
          combined = combined.filter(item => !item.isService && !['Laptop', 'Desktop'].includes(item.category));
        } else {
          combined = combined.filter(item => !item.isService && item.category.toLowerCase() === categoryScope.toLowerCase());
        }
      }

      return combined.filter(item => {
        const textToSearch = `
          ${item.name}
          ${item.brand || ''}
          ${item.category || ''}
          ${item.processor || ''}
          ${item.ram ? item.ram + 'GB' : ''}
          ${item.storage ? item.storage + 'GB' : ''}
          ${item.storageType || ''}
          ${item.description || ''}
        `.toLowerCase();
        return textToSearch.includes(q);
      }).slice(0, 8);
    }

    function renderSuggestions() {
      const scope = catSelect ? catSelect.value : 'all';
      const matches = getMatches(input.value, scope);
      activeIndex = Math.min(activeIndex, matches.length - 1);

      if (!matches.length) {
        suggestions.innerHTML = `
          <div style="padding: 1rem; text-align: center; color: var(--on-surface-variant); font-size: 13px;">
            No matching laptops, parts or services found for "<strong>${escapeHTML(input.value)}</strong>".<br>
            <small style="color: var(--outline);">Try searching by brand (Lenovo, Dell, Apple), part (SSD, RAM) or repair.</small>
          </div>
        `;
        suggestions.classList.add('open');
        return;
      }

      suggestions.innerHTML = matches.map((item, idx) => {
        const isActive = idx === activeIndex ? 'active' : '';
        const thumb = item.isService
          ? `<div style="width:36px;height:36px;border-radius:6px;background:var(--surface-container);color:var(--primary);display:grid;place-items:center;"><span class="icon">${item.icon}</span></div>`
          : `<img src="${item.image}" alt="${escapeHTML(item.name)}">`;

        return `
          <a role="option" aria-selected="${idx === activeIndex}" class="suggestion-item ${isActive}" href="${item.url}">
            ${thumb}
            <div class="suggestion-item-info">
              <strong>${escapeHTML(item.name)}</strong>
              <small>${escapeHTML(item.category)}${!item.isService && item.price ? ` • ${money(item.price)}` : ''}</small>
            </div>
            <span class="icon" style="color:var(--outline);font-size:16px;">arrow_forward</span>
          </a>
        `;
      }).join('');

      suggestions.classList.add('open');
    }

    function executeNavigation() {
      const scope = catSelect ? catSelect.value : 'all';
      const matches = getMatches(input.value, scope);

      if (activeIndex >= 0 && matches[activeIndex]) {
        window.location.href = matches[activeIndex].url;
      } else if (input.value.trim()) {
        window.location.href = `buy.html?q=${encodeURIComponent(input.value.trim())}`;
      }
    }

    // Input & Focus Listeners
    input.addEventListener('input', () => {
      activeIndex = -1;
      if (input.value.trim().length >= 1) {
        renderSuggestions();
      } else {
        suggestions.classList.remove('open');
      }
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 1) {
        renderSuggestions();
      }
    });

    if (catSelect) {
      catSelect.addEventListener('change', () => {
        if (input.value.trim().length >= 1) {
          renderSuggestions();
        }
      });
    }

    if (btn) {
      btn.addEventListener('click', executeNavigation);
    }

    // Keyboard Navigation: ArrowDown, ArrowUp, Enter, Escape
    input.addEventListener('keydown', e => {
      const scope = catSelect ? catSelect.value : 'all';
      const matches = getMatches(input.value, scope);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, matches.length - 1);
        renderSuggestions();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        renderSuggestions();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeNavigation();
      } else if (e.key === 'Escape') {
        suggestions.classList.remove('open');
      }
    });

    // Close on click outside
    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) {
        suggestions.classList.remove('open');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initGlobalSearch);
})();
