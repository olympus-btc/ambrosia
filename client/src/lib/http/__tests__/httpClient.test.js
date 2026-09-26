import { httpClient, refreshAccessToken } from "../httpClient";
import { httpWrapper } from "../httpWrapper";

jest.mock("../httpWrapper", () => ({
  httpWrapper: jest.fn(),
}));

function mockResponse(status) {
  return { ok: status >= 200 && status < 300, status };
}

describe("httpClient", () => {
  let forbiddenListener;

  beforeEach(() => {
    jest.clearAllMocks();
    forbiddenListener = jest.fn();
    window.addEventListener("auth:forbidden", forbiddenListener);
  });

  afterEach(() => {
    window.removeEventListener("auth:forbidden", forbiddenListener);
  });

  it("dispatches auth:forbidden on a 403 by default", async () => {
    httpWrapper.mockResolvedValueOnce(mockResponse(403));

    await httpClient("/products");

    expect(forbiddenListener).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch auth:forbidden on a 403 when skipForbiddenRedirect is true", async () => {
    httpWrapper.mockResolvedValueOnce(mockResponse(403));

    await httpClient("/products", { skipForbiddenRedirect: true });

    expect(forbiddenListener).not.toHaveBeenCalled();
  });

  it("still dispatches auth:forbidden on a 403 when only skipRefresh is true", async () => {
    httpWrapper.mockResolvedValueOnce(mockResponse(403));

    await httpClient("/products", { skipRefresh: true });

    expect(forbiddenListener).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch auth:forbidden on a successful response", async () => {
    httpWrapper.mockResolvedValueOnce(mockResponse(200));

    await httpClient("/products");

    expect(forbiddenListener).not.toHaveBeenCalled();
  });

  describe("token refresh", () => {
    let expiredListener;

    beforeEach(() => {
      expiredListener = jest.fn();
      window.addEventListener("auth:expired", expiredListener);
    });

    afterEach(() => {
      window.removeEventListener("auth:expired", expiredListener);
    });

    it("retries the request after a successful refresh", async () => {
      httpWrapper
        .mockResolvedValueOnce(mockResponse(401))
        .mockResolvedValueOnce(mockResponse(200))
        .mockResolvedValueOnce(mockResponse(200));

      const retriedProductsResponse = await httpClient("/products");

      expect(httpWrapper).toHaveBeenNthCalledWith(2, "/auth/refresh", { method: "POST" });
      expect(retriedProductsResponse.status).toBe(200);
      expect(expiredListener).not.toHaveBeenCalled();
    });

    it("dispatches auth:expired when the refresh returns 401", async () => {
      httpWrapper.mockResolvedValueOnce(mockResponse(401)).mockResolvedValueOnce(mockResponse(401));

      await httpClient("/products");

      expect(expiredListener).toHaveBeenCalledTimes(1);
    });

    it("dispatches auth:expired when the refresh fails with a non-401 error", async () => {
      httpWrapper.mockResolvedValueOnce(mockResponse(401)).mockResolvedValueOnce(mockResponse(500));

      await httpClient("/products");

      expect(expiredListener).toHaveBeenCalledTimes(1);
      expect(httpWrapper).toHaveBeenCalledTimes(2);
    });

    it("shares a single in-flight refresh between concurrent callers", async () => {
      httpWrapper.mockResolvedValue(mockResponse(200));

      await Promise.all([refreshAccessToken(), refreshAccessToken()]);

      expect(httpWrapper).toHaveBeenCalledTimes(1);
    });
  });
});
