export const OBSOLETE_RUNTIME_CACHE_NAMES = ["apis", "api-cache", "pages", "pages-rsc", "pages-rsc-prefetch", "others"];

export function isApiPath(requestPath) {
  return requestPath === "/api" || requestPath.startsWith("/api/");
}

export function isPageNavigationRequest({ request, sameOrigin }) {
  return sameOrigin && request.mode === "navigate";
}

export function isPageDataRequest({ request, sameOrigin, url }) {
  return sameOrigin && request.headers.get("RSC") === "1" && !isApiPath(url.pathname);
}

export async function deleteObsoleteRuntimeCaches() {
  await Promise.all(
    OBSOLETE_RUNTIME_CACHE_NAMES.map((obsoleteCacheName) => caches.delete(obsoleteCacheName).catch(() => false)),
  );
}
