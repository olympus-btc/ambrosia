/** @type {import('next').NextConfig} */
const nextConfig = {
  // Creates optimized bundle with minified deps for Electron
  output: "standalone",

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
