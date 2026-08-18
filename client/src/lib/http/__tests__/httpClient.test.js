import { httpClient } from "../httpClient";
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
});
