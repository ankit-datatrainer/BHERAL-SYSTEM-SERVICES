const fs = require('fs');
const path = require('path');

const pages = [
  'index.html', 'buy.html', 'product.html', 'parts.html',
  'sell.html', 'repair.html', 'cart.html', 'wishlist.html',
  'checkout.html', 'track.html', 'contact.html', 'privacy.html',
  'terms.html', 'warranty.html'
];

let errors = 0;

pages.forEach(p => {
  if (!fs.existsSync(p)) {
    console.error('Missing page:', p);
    errors++;
    return;
  }
  const html = fs.readFileSync(p, 'utf8');

  // Check scripts
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const src = match[1];
    if (!src.startsWith('http') && !fs.existsSync(src)) {
      console.error(p + ': Script not found -> ' + src);
      errors++;
    }
  }

  // Check local css
  const cssRegex = /<link[^>]+href=["']([^"']+\.css)["']/g;
  while ((match = cssRegex.exec(html)) !== null) {
    const href = match[1];
    if (!href.startsWith('http') && !fs.existsSync(href)) {
      console.error(p + ': CSS not found -> ' + href);
      errors++;
    }
  }

  console.log('✓ Verified ' + p + ' (' + html.length + ' bytes)');
});

if (errors === 0) {
  console.log('\nSUCCESS: ALL 14 PAGES VERIFIED WITH ZERO BROKEN SCRIPT OR CSS LINKS!');
} else {
  console.error('\nEncountered ' + errors + ' errors');
  process.exit(1);
}
