import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';

import '@/styles/style.css';
import '@/styles/responsive.css';
import '@/styles/award.css';
import '@/styles/dashboard.css';

import { StoreProvider } from '@/components/StoreProvider';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { MotionLayer } from '@/components/MotionLayer';

export const metadata: Metadata = {
  metadataBase: new URL('https://bheralsystems.example'),
  title: {
    default: 'Bheral Systems & Services | Buy, Sell & Repair Refurbished Laptops Delhi NCR',
    template: '%s | Bheral Systems & Services',
  },
  description:
    "Delhi NCR's premier computer re-commerce facility. Buy certified refurbished business laptops with 6-month warranty, sell old devices for spot cash, or book chip-level repairs with free doorstep pickup.",
  icons: { icon: '/assets/images/bheral-logo.svg' },
  openGraph: {
    title: 'Bheral Systems & Services | Buy, Sell & Repair Refurbished Laptops Delhi',
    description:
      'Nehru Place direct stocks, 50-point tested corporate laptops, instant buyback valuation, and precision hardware diagnostics.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="aw-js">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&family=JetBrains+Mono:wght@400;500;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..24,400..700,0..1,-50..200&display=swap"
        />
      </head>
      <body>
        <StoreProvider>
          {/* useSearchParams needs a Suspense boundary during prerender. */}
          <Suspense fallback={null}>
            <MotionLayer />
          </Suspense>
          <SiteHeader />
          <main className="page" id="app">
            {children}
          </main>
          <SiteFooter />
        </StoreProvider>
      </body>
    </html>
  );
}
