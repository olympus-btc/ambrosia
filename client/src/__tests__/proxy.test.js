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
    const body = url.pathname === "/api/initial-setup"
      ? { initialized: true, needsBusinessType: false }
      : { businessType };
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  });
}

function requestTo(pathname) {
  return {
    url: `http://localhost:3000${pathname}`,
    headers: new Headers(),
    cookies: { get: (name) => (name === "refreshToken" ? { value: "token" } : undefined) },
  };
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

    const response = await proxy(requestTo(pathname));

    expect(response.redirectedTo).toBe(expectedRedirect);
  });

  it.each([
    ["freelance", "/freelancer/timesheet"],
    ["store", "/store/products"],
  ])("lets a %s session through to %s and keeps its businessType cookie", async (businessType, pathname) => {
    mockBackend(businessType);

    const response = await proxy(requestTo(pathname));

    expect(response.redirectedTo).toBeUndefined();
    expect(response.cookies.set).toHaveBeenCalledWith("businessType", businessType, { path: "/" });
  });
});
