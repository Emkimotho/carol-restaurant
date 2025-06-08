// File: next.config.js
// ──────────────────────────────────────────────────────────────
//  Global Next.js configuration for “19th-Hole”
//
//  Highlights
//  ──────────
//  1.   Forces all server-side code to run in Eastern Time.
//  2.   Keeps React strict-mode on in dev for extra warnings.
//  3.   Produces a ‘standalone’ build folder for easy Docker /
//       PM2 / Render / Railway / Fly deployment.
//  4.   Skips ESLint during `next build` so production deploys
//       can never be blocked by lint errors (you can still run
//       `npm run lint` locally to see issues).
//  5.   Configures Next/Image to allow Cloudinary-hosted images
//       (and any other remote sources you whitelist).
//  6.   **No** secrets are inlined — they’re read from process.env
//       at runtime.  Use NEXT_PUBLIC_* for client-side variables.
//
//  Docs → https://nextjs.org/docs/app/api-reference/next-config-js
// ──────────────────────────────────────────────────────────────

/* 0. Force Node.js to America/New_York *before* anything runs */
process.env.TZ = "America/New_York";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* 1 — React / TypeScript */
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false, // fail build if TS compiler fails
  },

  /* 2 — Image optimisation
       Use remotePatterns to allow <Image> to fetch from these hosts */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.ctfassets.net",
        port: "",
        pathname: "/**",
      },
      // add more remotePatterns entries as needed
    ],
  },

  /* 3 — Output target (ideal for Docker / standalone hosting) */
  output: "standalone",

  /* 4 — Skip ESLint in production builds */
  eslint: {
    ignoreDuringBuilds: true,
  },

  /* 5 — Experimental flags (enable as you adopt them) */
  experimental: {
    // serverActions: true,
    // turbo: { /* … */ },
  },
};

module.exports = nextConfig;
