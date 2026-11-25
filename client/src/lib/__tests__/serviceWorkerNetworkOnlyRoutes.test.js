import {
  deleteObsoleteRuntimeCaches,
  isApiPath,
  isPageDataRequest,
  isPageNavigationRequest,
  OBSOLETE_RUNTIME_CACHE_NAMES,
} from "../serviceWorkerNetworkOnlyRoutes";

const buildServiceWorkerRequest = ({ mode = "cors", headers = {} } = {}) => ({
  mode,
  headers: new Headers(headers),
});

describe("isApiPath", () => {
  it("matches the api root and every api route", () => {
    expect(isApiPath("/api")).toBe(true);
    expect(isApiPath("/api/users/me")).toBe(true);
    expect(isApiPath("/api/ws-payments")).toBe(true);
  });

  it("does not match routes that only share the prefix or live elsewhere", () => {
    expect(isApiPath("/apiary")).toBe(false);
    expect(isApiPath("/store/api")).toBe(false);
    expect(isApiPath("/auth")).toBe(false);
  });
});

describe("isPageNavigationRequest", () => {
  it("matches same-origin page navigations", () => {
    const navigationRequest = buildServiceWorkerRequest({ mode: "navigate" });
    expect(isPageNavigationRequest({ request: navigationRequest, sameOrigin: true })).toBe(true);
  });

  it("does not match cross-origin navigations or regular fetches", () => {
    const navigationRequest = buildServiceWorkerRequest({ mode: "navigate" });
    const regularFetchRequest = buildServiceWorkerRequest({ mode: "cors" });
    expect(isPageNavigationRequest({ request: navigationRequest, sameOrigin: false })).toBe(false);
    expect(isPageNavigationRequest({ request: regularFetchRequest, sameOrigin: true })).toBe(false);
  });
});

describe("isPageDataRequest", () => {
  const pageUrl = new URL("https://unit.local/store/cart");

  it("matches same-origin React Server Component requests for pages", () => {
    const pageDataRequest = buildServiceWorkerRequest({ headers: { RSC: "1" } });
    expect(isPageDataRequest({ request: pageDataRequest, sameOrigin: true, url: pageUrl })).toBe(true);
  });

  it("does not match api routes, cross-origin requests or requests without the RSC header", () => {
    const pageDataRequest = buildServiceWorkerRequest({ headers: { RSC: "1" } });
    const regularFetchRequest = buildServiceWorkerRequest();
    const apiUrl = new URL("https://unit.local/api/config");
    expect(isPageDataRequest({ request: pageDataRequest, sameOrigin: true, url: apiUrl })).toBe(false);
    expect(isPageDataRequest({ request: pageDataRequest, sameOrigin: false, url: pageUrl })).toBe(false);
    expect(isPageDataRequest({ request: regularFetchRequest, sameOrigin: true, url: pageUrl })).toBe(false);
  });
});

describe("deleteObsoleteRuntimeCaches", () => {
  let originalCaches;

  beforeEach(() => {
    originalCaches = global.caches;
  });

  afterEach(() => {
    global.caches = originalCaches;
  });

  it("deletes every runtime cache that held api responses or pages", async () => {
    global.caches = { delete: jest.fn().mockResolvedValue(true) };

    await deleteObsoleteRuntimeCaches();

    expect(global.caches.delete).toHaveBeenCalledTimes(OBSOLETE_RUNTIME_CACHE_NAMES.length);
    OBSOLETE_RUNTIME_CACHE_NAMES.forEach((obsoleteCacheName) => {
      expect(global.caches.delete).toHaveBeenCalledWith(obsoleteCacheName);
    });
  });

  it("keeps deleting the remaining caches when one deletion fails", async () => {
    global.caches = {
      delete: jest.fn()
        .mockRejectedValueOnce(new Error("Cache storage unavailable"))
        .mockResolvedValue(true),
    };

    await expect(deleteObsoleteRuntimeCaches()).resolves.toBeUndefined();
    expect(global.caches.delete).toHaveBeenCalledTimes(OBSOLETE_RUNTIME_CACHE_NAMES.length);
  });
});
