import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Creates optimized bundle with minified deps for Electron
  output: "standalone",

  // Pin file tracing root to client/ to prevent Turbopack from going up to
  // the monorepo root and breaking PostCSS/Tailwind module resolution
  outputFileTracingRoot: __dirname,

  // Image configuration for Electron
  images: {
    unoptimized: true, // Required for Electron
  },

  // Disable telemetry
  telemetry: false,

  // Headers configuration (keep CORS for development)
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
