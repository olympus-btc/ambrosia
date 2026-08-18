import { createSerwistRoute } from "@serwist/turbopack";

const serwistRoute = createSerwistRoute({
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
