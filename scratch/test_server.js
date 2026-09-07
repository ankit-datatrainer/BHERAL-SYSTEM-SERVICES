const http = require('http');

const urls = [
  '/',
  '/index.html',
  '/buy.html',
  '/product.html?id=lenovo-t14-g2',
  '/parts.html',
  '/sell.html',
  '/sell.html?category=SSD',
  '/repair.html',
  '/repair.html?service=Screen%20Replacement',
  '/cart.html',
  '/wishlist.html',
  '/checkout.html',
  '/track.html',
  '/contact.html',
  '/privacy.html',
  '/terms.html',
  '/warranty.html',
  '/css/style.css',
  '/css/responsive.css',
  '/js/data.js',
  '/js/app.js',
  '/js/search.js',
  '/js/products.js',
  '/js/cart.js',
  '/js/wishlist.js',
  '/js/checkout.js',
  '/js/sell.js',
  '/js/repair.js',
  '/js/tracking.js',
  '/assets/images/bheral-logo.svg',
  '/assets/images/lenovo-t14.jpg',
  '/assets/images/hero-laptop.jpg',
  '/assets/images/corporate-laptops.jpg'
];

async function checkUrl(urlPath) {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:8080' + urlPath, res => {
      if (res.statusCode === 200) {
        resolve({ path: urlPath, status: res.statusCode, ok: true });
      } else {
        resolve({ path: urlPath, status: res.statusCode, ok: false });
      }
    }).on('error', err => {
      reject(err);
    });
  });
}

async function run() {
  let failed = 0;
  for (const u of urls) {
    try {
      const res = await checkUrl(u);
      if (res.ok) {
        console.log(`✓ [200 OK] http://127.0.0.1:8080${u}`);
      } else {
        console.error(`✗ [${res.status}] http://127.0.0.1:8080${u}`);
        failed++;
      }
    } catch (e) {
      console.error(`Error requesting ${u}:`, e.message);
      failed++;
    }
  }

  if (failed === 0) {
    console.log('\nALL 32 ENDPOINTS AND ASSETS RESPONDED 200 OK FROM LOCAL SERVER!');
  } else {
    console.error(`\nFAILED: ${failed} requests failed.`);
    process.exit(1);
  }
}

run();
