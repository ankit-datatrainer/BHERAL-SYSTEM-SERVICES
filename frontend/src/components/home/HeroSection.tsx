'use client';

/**
 * Modern Hero Section matching the requested design mockup:
 * - Rounded card container with soft gradient backdrop
 * - NEW ARRIVAL pill badge
 * - Powerful Laptops / Limitless Possibilities headline
 * - SHOP NOW and EXPLORE RANGE CTA buttons
 * - 4-item Trust Guarantee strip
 * - High-resolution AI-generated laptop showcase with circular discount badge
 */
import Link from 'next/link';
import { imageUrl } from '@/lib/format';

export function HeroSection() {
  return (
    <section className="hero-mockup">
      <div className="container">
        <div className="hero-mockup-card">
          {/* Left Column Content */}
          <div className="hero-mockup-left">
            <div className="hero-pill-badge">NEW ARRIVAL</div>
            <h1 className="hero-mockup-headline">
              Buy, Repair, <span className="text-primary-gradient">Sell.</span>
            </h1>
            <p className="hero-mockup-sub">
              From performance to portability, find the perfect laptop that fits your life and fuels your passion.
            </p>
            <div className="hero-mockup-ctas">
              <Link href="/buy" className="btn-mockup-primary">
                <span>SHOP NOW</span>
                <span className="icon" style={{ fontSize: 18 }}>arrow_forward</span>
              </Link>
              <Link href="#shop-by-category" className="btn-mockup-secondary">
                EXPLORE RANGE
              </Link>
            </div>

            {/* 4-Item Trust Guarantee Strip */}
            <div className="hero-trust-strip">
              <div className="hero-trust-item">
                <span className="icon trust-icon">verified_user</span>
                <div className="trust-text">
                  <strong>100%</strong>
                  <small>Authentic Products</small>
                </div>
              </div>
              <div className="trust-divider" />
              <div className="hero-trust-item">
                <span className="icon trust-icon">local_shipping</span>
                <div className="trust-text">
                  <strong>Free Shipping</strong>
                  <small>On orders over ₹999</small>
                </div>
              </div>
              <div className="trust-divider" />
              <div className="hero-trust-item">
                <span className="icon trust-icon">restore</span>
                <div className="trust-text">
                  <strong>Easy Returns</strong>
                  <small>30-Day Return</small>
                </div>
              </div>
              <div className="trust-divider" />
              <div className="hero-trust-item">
                <span className="icon trust-icon">lock</span>
                <div className="trust-text">
                  <strong>Secure Payment</strong>
                  <small>100% Safe &amp; Secure</small>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Visual Showcase */}
          <div className="hero-mockup-right">
            <div className="hero-img-showcase">
              <div className="hero-discount-badge">
                <small>UP TO</small>
                <strong>25%</strong>
                <small>OFF</small>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl('assets/images/hero-laptops-showcase.png')}
                alt="Buy, Repair, Sell - Bheral Systems & Services"
                className="hero-main-laptop"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
