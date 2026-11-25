/**
 * @jest-environment node
 */
import proxy from "../proxy";

jest.mock("next/server", () => ({
  NextResponse: {
    redirect: (url) => ({ redirectedTo: url.pathname }),
    next: () => ({ headers: new Headers(), cookies: { set: jest.fn() } }),
  },
}));

function mockBackend(businessType) {
  global.fetch = jest.fn((url) => {
    const backendResponsePayload = url.pathname === "/api/initial-setup"
      ? { initialized: true, needsBusinessType: false }
      : { businessType };
    return Promise.resolve({ ok: true, json: () => Promise.resolve(backendResponsePayload) });
  });
}

function requestTo(pathname) {
  return {
    url: `http://localhost:3000${pathname}`,
    headers: new Headers(),
    cookies: { get: (name) => (name === "refreshToken" ? { value: "token" } : undefined) },
  };
}

function mockBackendWithFailedInitialSetup() {
  global.fetch = jest.fn((url) => {
    if (url.pathname === "/api/initial-setup") {
      return Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({}) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ businessType: null }) });
  });
}

describe("proxy business type routing", () => {
  it.each([
    ["store", "/freelancer/clients", "/store"],
    ["restaurant", "/freelancer", "/restaurant/all-orders"],
    ["freelance", "/store/products", "/freelancer"],
    ["freelance", "/restaurant/all-orders", "/freelancer"],
    ["restaurant", "/store", "/restaurant/all-orders"],
    ["store", "/restaurant/all-orders", "/store"],
  ])("redirects a %s session away from %s to %s", async (businessType, pathname, expectedRedirect) => {
    mockBackend(businessType);

    const redirectResponse = await proxy(requestTo(pathname));

    expect(redirectResponse.redirectedTo).toBe(expectedRedirect);
  });

  it.each([
    ["freelance", "/freelancer/timesheet"],
    ["store", "/store/products"],
  ])("lets a %s session through to %s and keeps its businessType cookie", async (businessType, pathname) => {
    mockBackend(businessType);

    const passThroughResponse = await proxy(requestTo(pathname));

    expect(passThroughResponse.redirectedTo).toBeUndefined();
    expect(passThroughResponse.cookies.set).toHaveBeenCalledWith("businessType", businessType, { path: "/" });
  });
});

describe("proxy onboarding gating when initial-setup cannot be confirmed", () => {
  it("does not redirect /onboarding away when the initial-setup check fails", async () => {
    mockBackendWithFailedInitialSetup();

    const passThroughResponse = await proxy(requestTo("/onboarding"));

    expect(passThroughResponse.redirectedTo).toBeUndefined();
  });

  it("does not redirect /auth to /onboarding when the initial-setup check fails", async () => {
    mockBackendWithFailedInitialSetup();

    const passThroughResponse = await proxy(requestTo("/auth"));

    expect(passThroughResponse.redirectedTo).toBeUndefined();
  });
});

describe("proxy offline fallback page", () => {
  function requestWithoutSessionTo(pathname) {
    return {
      url: `http://localhost:3000${pathname}`,
      headers: new Headers(),
      cookies: { get: () => undefined },
    };
  }

  it("serves /offline without a session so the service worker never precaches the login page in its place", async () => {
    mockBackend("store");

    const passThroughResponse = await proxy(requestWithoutSessionTo("/offline"));

    expect(passThroughResponse.redirectedTo).toBeUndefined();
    expect(passThroughResponse.headers.get("Content-Security-Policy")).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("serves /offline even when the unit has not finished onboarding", async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ initialized: false, needsBusinessType: true }),
    }));

    const passThroughResponse = await proxy(requestWithoutSessionTo("/offline"));

    expect(passThroughResponse.redirectedTo).toBeUndefined();
  });

  it("still redirects other pages to /auth without a session", async () => {
    mockBackend("store");

    const redirectResponse = await proxy(requestWithoutSessionTo("/offline-orders"));

    expect(redirectResponse.redirectedTo).toBe("/auth");
  });
});
