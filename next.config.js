// File: next.config.js
// ──────────────────────────────────────────────────────────────
//  Global Next.js configuration for “19th-Hole”
//
//  Highlights:
//  1. Forces all server-side code to run in Eastern Time.
//  2. Enables React strict-mode and TypeScript checks in development.
//  3. Produces a standalone build for Docker/PM2/Render/Fly deployments.
//  4. Skips ESLint errors during production builds.
//  5. Configures Next/Image to allow Cloudinary (and other) external images.
//  6. Reads secrets at runtime—use NEXT_PUBLIC_* for client-side vars.
//
//  Docs → https://nextjs.org/docs/api-reference/next.config.js
// ──────────────────────────────────────────────────────────────

/* 0. Force Node.js to America/New_York *before* anything runs */
process.env.TZ = "America/New_York";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1 — React and TypeScript
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false, // Fail the build on TS errors
  },

  // 2 — Image optimization: allow remote images
  images: {
    // Preferred for Next 13+: granular control over allowed hosts/paths
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
      // Add other hosts here as needed
    ],
    // You can also whitelist entire domains
    domains: [
      "res.cloudinary.com",
      "images.ctfassets.net",
    ],
  },

  // 3 — Build output
  output: "standalone", // Ideal for Docker or similar environments

  // 4 — ESLint settings
  eslint: {
    ignoreDuringBuilds: true, // Don’t block production builds on lint errors
  },

  // 5 — Experimental flags
  experimental: {
    forceSwcTransforms: true, // Ensure SWC is used even with a .babelrc
    // serverActions: true,
    // turbo: { /* … */ },
  },
};

module.exports = nextConfig;
