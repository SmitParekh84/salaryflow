import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isProduction ? "" : " ws: wss:"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  /**
   * Emits `.next/standalone` with only the node_modules the server actually
   * loads, traced from the build. The container image drops from roughly a
   * gigabyte to a couple of hundred megabytes, which is what makes it fit
   * comfortably on the 1 GB Lightsail Micro tier. See DEPLOYMENT.md.
   */
  output: "standalone",
  devIndicators: false,
  poweredByHeader: false,
  experimental: {
    /**
     * Every page in the app group is a client component reading from the
     * device's own store — the server contributes no figures to them. With the
     * `dynamic` default of 0 seconds, returning to a page you were just on
     * still cost a round trip for a payload that cannot have changed.
     *
     * Caching those segments makes back-and-forth navigation instant and
     * offline-tolerant. It cannot serve stale money: the numbers are rendered
     * on the client from state that syncs independently.
     */
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
  },
  async headers() {
    const securityHeaders = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      ...(isProduction
        ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
        : []),
    ];

    return [
      { source: "/:path*", headers: securityHeaders },

      /*
       * Everything under `public/` is served with `max-age=0` by default, so
       * the app icons and the manifest were revalidated on every single load —
       * a round trip per icon, on a connection that has better things to do.
       *
       * These URLs are not content-hashed the way `/_next/static` is, so they
       * cannot be `immutable`. A week of freshness plus a month of
       * stale-while-revalidate gives instant reuse while still letting a
       * changed icon reach existing installs on its own.
       */
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },

      /*
       * The service worker is the one file that must never be pinned: a cached
       * copy keeps serving its own caching rules, so a stale one cannot be
       * corrected by shipping a new build.
       */
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },

      /*
       * Route handlers answer with no cache directive at all, which leaves a
       * response holding one account's balances eligible for heuristic reuse.
       * Say plainly that none of it is storable.
       */
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
