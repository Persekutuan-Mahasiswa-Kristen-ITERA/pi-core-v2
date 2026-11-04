import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Cache Components is off on purpose (docs/ARCHITECTURE.md, decision D-03): every screen except
  // Login/Offline is per-user and authorization-dependent, so all rendering stays dynamic and no
  // user data can end up in a shared cache.
  poweredByHeader: false,
  experimental: {
    // Off for `next build` only. Vercel restores `.next/cache` between deployments, and with the
    // custom Tailwind loader below a restored Turbopack cache shipped the previous globals.css:
    // production of e45174e served old tokens and a `--font-sans` pointing at a font that no
    // longer loads (serif fallback on every device). A cold build costs a few seconds; stale CSS
    // costs the whole look. `next dev` keeps its cache.
    turbopackFileSystemCacheForBuild: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
