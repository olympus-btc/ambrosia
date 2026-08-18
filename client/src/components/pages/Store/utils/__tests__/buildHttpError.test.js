import { parseJsonResponse } from "@/lib/http";

import { buildHttpError, buildParsedHttpError } from "../buildHttpError";

jest.mock("@/lib/http", () => ({
  parseJsonResponse: jest.fn(),
}));

describe("buildHttpError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an Error with status and backend response message", () => {
    const httpRequestError = buildHttpError(
      { status: 409 },
      "Error creating role",
      { message: "Role already exists" },
    );

    expect(httpRequestError).toBeInstanceOf(Error);
    expect(httpRequestError.message).toBe("Error creating role");
    expect(httpRequestError.status).toBe(409);
    expect(httpRequestError.responseMessage).toBe("Role already exists");
  });

  it("creates an Error without a backend response message", () => {
    const httpRequestError = buildHttpError({ status: 500 }, "Request failed");

    expect(httpRequestError).toBeInstanceOf(Error);
    expect(httpRequestError.message).toBe("Request failed");
    expect(httpRequestError.status).toBe(500);
    expect(httpRequestError.responseMessage).toBeUndefined();
  });

  it("creates an Error with the backend error code and source", () => {
    const httpRequestError = buildHttpError(
      { status: 409 },
      "Error refunding order",
      { message: "Order cannot be refunded", code: "order_not_paid", source: "ambrosia" },
    );

    expect(httpRequestError.code).toBe("order_not_paid");
    expect(httpRequestError.source).toBe("ambrosia");
  });

  it("parses the response body before creating an Error", async () => {
    const failedHttpResponse = { status: 422 };
    parseJsonResponse.mockResolvedValueOnce({ message: "Invalid refund invoice" });

    const httpRequestError = await buildParsedHttpError(failedHttpResponse, "Refund failed");

    expect(parseJsonResponse).toHaveBeenCalledWith(failedHttpResponse, null);
    expect(httpRequestError).toMatchObject({
      message: "Refund failed",
      status: 422,
      responseMessage: "Invalid refund invoice",
    });
    expect(httpRequestError).toBeInstanceOf(Error);
  });
});
