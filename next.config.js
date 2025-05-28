// File: next.config.js
/**
 * next.config.js ‒ central build‑time configuration
 * ──────────────────────────────────────────────────────────────
 *  •  Sets Node’s time‑zone to America/New_York so every piece
 *     of server‑side code (API routes, SSR, cron, etc.) runs on
 *     Hagerstown, MD local time.
 *  •  Secrets such as NEXTAUTH_SECRET are still **not** inlined;
 *     read them from process.env at runtime.
 *
 *  Docs: https://nextjs.org/docs/app/api-reference/next-config-js
 */

/* ──────────────────────────────────────────────────────────────
   0. Force Node.js to Eastern Time *before* anything else runs
────────────────────────────────────────────────────────────── */
process.env.TZ = "America/New_York";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* ────────────────────────────────────────────────────────────
     1. React & TypeScript
  ──────────────────────────────────────────────────────────── */
  reactStrictMode: true,        // extra runtime warnings in dev
  typescript: {
    ignoreBuildErrors: false,   // fail build on TS errors
  },

  /* ────────────────────────────────────────────────────────────
     2. Images & Fonts
  ──────────────────────────────────────────────────────────── */
  images: {
    // Add your external asset domains here
    remotePatterns: [
      { protocol: "https", hostname: "images.ctfassets.net" },
    ],
  },

  /* ────────────────────────────────────────────────────────────
     3. Output target
        "standalone" produces a single output folder that
        contains every file needed to run the app in prod.
        Perfect for Docker, PM2, Render, Railway, Fly, etc.
  ──────────────────────────────────────────────────────────── */
  output: "standalone",

  /* ────────────────────────────────────────────────────────────
     4. Experimental opts (all OFF by default)
        Enable only the ones you actually use.
  ──────────────────────────────────────────────────────────── */
  experimental: {
    // appDir:          true,   // already true when using /app
    // serverActions:   true,   // turn on when you start using them
    // turbo: {         /* … */ },
  },

  /* ────────────────────────────────────────────────────────────
     5. **NO** env block here!
     ────────────────────────────────────────────────────────────
     Why?
       • Anything placed under `env` is string‑inlined during the
         build ‒ including secrets ‒ and will be visible in the
         final JS shipped to the browser.
       • All server runtimes (Node, Edge, Vercel Functions) can
         read from process.env *directly* at request time.
     Recommendation:
       • Put     NEXTAUTH_SECRET  &  NEXTAUTH_URL
         in      .env.local   (dev)  and Vercel Project → Env Vars.
       • Prepend NEXT_PUBLIC_ for variables that *must* be readable
         on the client.
  ──────────────────────────────────────────────────────────── */
};

module.exports = nextConfig;
