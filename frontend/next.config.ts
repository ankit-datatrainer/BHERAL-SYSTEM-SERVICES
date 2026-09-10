import type { NextConfig } from 'next';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Images come from /public, so the optimiser is unnecessary here and would
  // only add a build-time dependency on sharp.
  images: { unoptimized: true },
  async rewrites() {
    // Lets the browser call same-origin /api/* in development and avoids CORS
    // entirely. In production point NEXT_PUBLIC_API_URL at the deployed API.
    return [{ source: '/api/:path*', destination: `${apiBase}/api/:path*` }];
  },
};

export default nextConfig;
