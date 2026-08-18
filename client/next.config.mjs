import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import { withSerwist } from "@serwist/turbopack";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === "development";

function getLocalNetworkIPs() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((iface) => iface.family === "IPv4" && !iface.internal)
    .map((iface) => iface.address);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@swc/helpers/**"],
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},
  allowedDevOrigins: isDev ? getLocalNetworkIPs() : [],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
