import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['better-sqlite3', 'pino', 'pino-pretty'],
  // Next.js 16 blocks cross-origin requests to dev-only assets (`/_next/hmr`, the
  // client chunks) by default, and it derives the "same origin" from the hostname
  // the dev server was initialized with (`localhost`). Playwright's `webServer`
  // health-checks and drives the app at `http://127.0.0.1:3100` (the config's
  // `BASE_URL`), which is a *different* origin to the browser, so hydration and
  // every client interaction were silently dead while the SSR HTML still looked
  // correct. Allowing the loopback IP here restores client behaviour in dev only —
  // this option has no effect on a production build.
  allowedDevOrigins: ['127.0.0.1'],
  // cacheComponents intentionally NOT enabled in v1 — see the decisions log.
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
