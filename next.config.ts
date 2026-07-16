import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Stops Next from bundling firebase-admin into the server chunks — Node requires it
   * from node_modules at runtime instead.
   *
   * Why this is needed: firebase-admin/auth → jwks-rsa → jose. jose went ESM-only at
   * v6, but jwks-rsa still pulls it in with a CommonJS require(). Plain Node tolerates
   * that; Next's bundler tracing and re-wrapping those modules does not, and you get:
   *
   *   ERR_REQUIRE_ESM: require() of ES Module .../jose/dist/webapi/index.js
   *   from .../jwks-rsa/src/utils.js not supported
   *
   * PRODUCTION BUILDS ONLY. `next dev` doesn't bundle server code this way, so this
   * error cannot reproduce locally with `npm run dev` — only with `npm run build`.
   * Run a local build before pushing.
   *
   * This is an upstream packaging mismatch, not something we caused. Keep this line
   * until firebase-admin's dependency chain finishes migrating to ESM.
   */
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;