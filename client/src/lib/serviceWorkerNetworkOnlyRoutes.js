import { isTrustPath } from "@/lib/trustCache";

export const OFFLINE_FALLBACK_ROUTE = "/offline";

export const OBSOLETE_RUNTIME_CACHE_NAMES = ["apis", "api-cache", "pages", "pages-rsc", "pages-rsc-prefetch", "others"];

export function isApiPath(requestPath) {
  return requestPath === "/api" || requestPath.startsWith("/api/");
}

export function isSameOriginTrustRequest({ sameOrigin: isSameOriginRequest, url: interceptedRequestUrl }) {
  return isSameOriginRequest && isTrustPath(interceptedRequestUrl.pathname);
}

export function isOfflineFallbackDocumentRequest({ request: failedRequest }) {
  return failedRequest.destination === "document" && !isTrustPath(new URL(failedRequest.url).pathname);
}

export function isSameOriginApiRequest({ sameOrigin: isSameOriginRequest, url: interceptedRequestUrl }) {
  return isSameOriginRequest && isApiPath(interceptedRequestUrl.pathname);
}

export function isPageNavigationRequest({ request: interceptedRequest, sameOrigin: isSameOriginRequest }) {
  return isSameOriginRequest && interceptedRequest.mode === "navigate";
}

export function isPageDataRequest({
  request: interceptedRequest,
  sameOrigin: isSameOriginRequest,
  url: interceptedRequestUrl,
}) {
  return isSameOriginRequest
    && interceptedRequest.headers.get("RSC") === "1"
    && !isApiPath(interceptedRequestUrl.pathname);
}

export async function deleteObsoleteRuntimeCaches() {
  await Promise.all(
    OBSOLETE_RUNTIME_CACHE_NAMES.map((obsoleteCacheName) => caches.delete(obsoleteCacheName).catch(() => false)),
  );
}
