import { randomUUID } from "crypto";

import { createSerwistRoute } from "@serwist/turbopack";

import { OFFLINE_FALLBACK_ROUTE } from "@/lib/serviceWorkerNetworkOnlyRoutes";

const offlinePageRevision = randomUUID();

const serwistRoute = createSerwistRoute({
  additionalPrecacheEntries: [{ url: OFFLINE_FALLBACK_ROUTE, revision: offlinePageRevision }],
  esbuildOptions: {
    target: "es2020",
  },
  swSrc: "src/app/sw.js",
  useNativeEsbuild: true,
});

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return serwistRoute.generateStaticParams();
}

export async function GET(request, context) {
  const serviceWorkerResponse = await serwistRoute.GET(request, context);
  serviceWorkerResponse.headers.set("Service-Worker-Allowed", "/");
  return serviceWorkerResponse;
}
