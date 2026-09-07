# Bheral Systems & Services

Responsive vanilla HTML, CSS and JavaScript storefront for buying refurbished computers, selling used devices and booking repairs in Delhi.

## Run locally

From this directory, start any static development server. For example:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080/`.

## Prototype storage

Cart, wishlist, demo orders, sell requests, repair requests and in-progress selling details are stored in browser `localStorage`. Checkout and contact forms do not connect to a payment gateway, email service or backend.

The original Google Stitch export remains available under `.stitch/designs/` as a visual reference.
