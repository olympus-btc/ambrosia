import { fetchTrustRequest, isTrustPath } from "../trustCache";

afterEach(() => {
  jest.restoreAllMocks();
});

it("matches trust routes without matching unrelated paths", () => {
  expect(isTrustPath("/trust")).toBe(true);
  expect(isTrustPath("/trust/check.html")).toBe(true);
  expect(isTrustPath("/trusted")).toBe(false);
  expect(isTrustPath("/store/settings")).toBe(false);
});

describe("fetchTrustRequest", () => {
  let originalResponse;

  beforeEach(() => {
    originalResponse = global.Response;
    global.Response = { error: jest.fn(() => ({ type: "error" })) };
  });

  afterEach(() => {
    global.Response = originalResponse;
  });

  it("always requests a fresh network response", async () => {
    const networkResponse = { status: 200 };
    jest.spyOn(global, "fetch").mockResolvedValue(networkResponse);
    const trustRequest = { url: "https://unit.local/trust/metadata.json" };
    expect(await fetchTrustRequest({ request: trustRequest })).toBe(networkResponse);
    expect(fetch).toHaveBeenCalledWith(trustRequest, { cache: "no-store" });
  });

  it("returns a network error instead of a cached success when TLS or connectivity fails", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new TypeError("TLS failed"));
    const networkErrorResponse = await fetchTrustRequest({ request: {} });
    expect(networkErrorResponse.type).toBe("error");
    expect(Response.error).toHaveBeenCalledTimes(1);
  });
});
