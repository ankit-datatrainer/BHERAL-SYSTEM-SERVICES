'use client';

import Link from 'next/link';
import { useEffect, useId } from 'react';
import { imageUrl, money } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useStore } from './StoreProvider';
import { useProducts } from '@/lib/useProducts';
import { WhatsAppIcon } from './WhatsAppIcon';

export function CartDrawer() {
  const {
    cart,
    cartCount,
    cartDrawerOpen,
    closeCartDrawer,
    setQty,
    removeFromCart,
    hydrated,
  } = useStore();

  const titleId = useId();
  const { products, loading } = useProducts(cart.map((line) => line.id));

  // Lock body scroll and register escape key listener when open
  useEffect(() => {
    if (!cartDrawerOpen) return;

    document.body.classList.add('no-scroll');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCartDrawer();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cartDrawerOpen, closeCartDrawer]);

  const lines = cart
    .map((line) => ({ line, product: products[line.id] }))
    .filter((row): row is { line: typeof row.line; product: Product } => Boolean(row.product));

  const subtotal = lines.reduce((sum, r) => sum + r.product.price * r.line.qty, 0);

  const whatsappMessage = encodeURIComponent(
    `Hi Bheral Systems, I would like to order the following from my cart:\n` +
      lines
        .map((l, i) => `${i + 1}. ${l.product.name} (Qty: ${l.line.qty}) - ${money(l.product.price * l.line.qty)}`)
        .join('\n') +
      `\n\nTotal: ${money(subtotal)}\nPlease confirm order availability and delivery timeline.`,
  );

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div
        className={`cart-drawer-backdrop${cartDrawerOpen ? ' open' : ''}`}
        onClick={closeCartDrawer}
        aria-hidden="true"
      />

      {/* Slide-over right drawer */}
      <aside
        className={`cart-drawer${cartDrawerOpen ? ' open' : ''}`}
        aria-labelledby={titleId}
        aria-modal="true"
        role="dialog"
        aria-hidden={!cartDrawerOpen}
      >
        {/* Drawer Header */}
        <div className="cart-drawer-header">
          <div className="cart-drawer-title-wrap">
            <span className="icon cart-drawer-header-icon">shopping_bag</span>
            <h3 id={titleId} className="cart-drawer-title">
              Shopping Cart
            </h3>
            {hydrated && cartCount > 0 && (
              <span className="cart-drawer-count-badge">
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <button
            type="button"
            className="cart-drawer-close-btn"
            onClick={closeCartDrawer}
            aria-label="Close cart drawer"
            title="Close (Esc)"
          >
            <span className="icon">close</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="cart-drawer-body">
          {!hydrated || loading ? (
            <div className="cart-drawer-loading">
              <div className="aw-skeleton" style={{ height: 90, borderRadius: 12, marginBottom: 12 }} />
              <div className="aw-skeleton" style={{ height: 90, borderRadius: 12, marginBottom: 12 }} />
              <div className="aw-skeleton" style={{ height: 90, borderRadius: 12 }} />
            </div>
          ) : lines.length === 0 ? (
            <div className="cart-drawer-empty">
              <div className="cart-drawer-empty-icon">
                <span className="icon">shopping_cart</span>
              </div>
              <h4>Your cart is empty</h4>
              <p>Explore our certified refurbished laptops backed by a 6-month replacement warranty.</p>
              <Link
                href="/buy"
                className="btn btn-primary btn-small"
                onClick={closeCartDrawer}
                style={{ marginTop: '1rem' }}
              >
                <span className="icon">laptop_mac</span> Browse Laptops
              </Link>
            </div>
          ) : (
            <div className="cart-drawer-items">
              {lines.map(({ line, product }) => {
                const maxQty = Math.min(10, Math.max(1, product.stock || 10));
                return (
                  <div className="cart-drawer-item" key={product.id}>
                    <Link
                      href={`/product/${product.id}`}
                      className="cart-drawer-thumb"
                      onClick={closeCartDrawer}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl(product.image)} alt={product.name} loading="lazy" />
                    </Link>

                    <div className="cart-drawer-item-details">
                      <div className="cart-drawer-item-top">
                        <Link
                          href={`/product/${product.id}`}
                          className="cart-drawer-item-name"
                          onClick={closeCartDrawer}
                        >
                          {product.name}
                        </Link>
                        <button
                          type="button"
                          className="cart-drawer-remove-btn"
                          onClick={() => removeFromCart(product.id)}
                          title="Remove item"
                          aria-label={`Remove ${product.name} from cart`}
                        >
                          <span className="icon">delete_outline</span>
                        </button>
                      </div>

                      <div className="cart-drawer-item-specs">
                        {product.processor && product.processor !== '—' && (
                          <span className="cart-drawer-spec-chip">
                            {product.processor.split('(')[0].trim()}
                          </span>
                        )}
                        {product.ram > 0 && (
                          <span className="cart-drawer-spec-chip">{product.ram}GB RAM</span>
                        )}
                        {product.storage > 0 && (
                          <span className="cart-drawer-spec-chip">
                            {product.storage}GB {product.storageType && product.storageType !== '—' ? product.storageType : 'SSD'}
                          </span>
                        )}
                      </div>

                      <div className="cart-drawer-item-bottom">
                        <div className="cart-drawer-stepper">
                          <button
                            type="button"
                            className="cart-drawer-stepper-btn"
                            disabled={line.qty <= 1}
                            onClick={() => setQty(product.id, line.qty - 1)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="cart-drawer-stepper-val">{line.qty}</span>
                          <button
                            type="button"
                            className="cart-drawer-stepper-btn"
                            disabled={line.qty >= maxQty}
                            onClick={() => setQty(product.id, line.qty + 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <div className="cart-drawer-item-price">
                          <strong>{money(product.price * line.qty)}</strong>
                          {line.qty > 1 && (
                            <small className="cart-drawer-unit-price">
                              {money(product.price)} ea
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {hydrated && lines.length > 0 && (
          <div className="cart-drawer-footer">
            {/* Free Shipping & Warranty Notice */}
            <div className="cart-drawer-trust-banner">
              <span className="icon">verified_user</span>
              <span>Free Insured Delivery • 6-Month Warranty</span>
            </div>

            <div className="cart-drawer-subtotal-row">
              <span>Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
              <strong className="cart-drawer-subtotal-val">{money(subtotal)}</strong>
            </div>

            <div className="cart-drawer-shipping-row">
              <span>Doorstep Delivery</span>
              <strong className="cart-drawer-free-text">FREE</strong>
            </div>

            <div className="cart-drawer-actions">
              <Link
                href="/checkout"
                className="btn btn-primary btn-block cart-drawer-checkout-btn"
                onClick={closeCartDrawer}
              >
                <span>Proceed to Checkout</span>
                <span className="icon">arrow_forward</span>
              </Link>

              <div className="cart-drawer-actions-split">
                <Link
                  href="/cart"
                  className="btn btn-secondary cart-drawer-viewcart-btn"
                  onClick={closeCartDrawer}
                >
                  View Full Cart
                </Link>

                <a
                  href={`https://wa.me/919654779949?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-green cart-drawer-whatsapp-btn"
                  title="Order quickly via WhatsApp"
                >
                  <WhatsAppIcon size={17} color="#ffffff" />
                  <span>WhatsApp Order</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
