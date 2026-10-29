/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Increase API body size limit to 20MB for image/file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  // Enterprise-Grade Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent site from being embedded in an iframe (Anti-Clickjacking)
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // Prevent MIME-sniffing exploits
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Strict Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // XSS Protection for legacy browsers
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Restrict unnecessary browser device sensors
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // DNS Prefetch control
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
