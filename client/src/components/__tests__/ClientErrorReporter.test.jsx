import { render } from "@testing-library/react";

import { useAuth } from "@/hooks/auth/useAuth";
import { reportClientError } from "@/lib/logging/reportClientError";

import ClientErrorReporter from "../ClientErrorReporter";

jest.mock("@/hooks/auth/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/logging/reportClientError", () => ({
  reportClientError: jest.fn(),
}));

function dispatchUnhandledRejection(rejectionReason) {
  const unhandledRejectionEvent = new Event("unhandledrejection");
  unhandledRejectionEvent.reason = rejectionReason;
  window.dispatchEvent(unhandledRejectionEvent);
}

describe("ClientErrorReporter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports uncaught errors and unhandled rejections while the user is signed in", () => {
    useAuth.mockReturnValue({ isAuth: true });
    render(<ClientErrorReporter />);

    window.dispatchEvent(new ErrorEvent("error", {
      error: new Error("Cart total is undefined"),
      message: "Cart total is undefined",
      filename: "http://localhost:3000/cart.js",
      lineno: 10,
      colno: 4,
    }));
    dispatchUnhandledRejection(new Error("Payment polling failed"));

    expect(reportClientError).toHaveBeenCalledWith(expect.objectContaining({
      errorMessage: "Cart total is undefined",
      context: { type: "window.error", file: "http://localhost:3000/cart.js:10:4" },
    }));
    expect(reportClientError).toHaveBeenCalledWith(expect.objectContaining({
      errorMessage: "Payment polling failed",
      context: { type: "unhandledrejection" },
    }));
  });

  it("does not listen for errors before the user signs in", () => {
    useAuth.mockReturnValue({ isAuth: false });
    render(<ClientErrorReporter />);

    dispatchUnhandledRejection(new Error("Login page failure"));

    expect(reportClientError).not.toHaveBeenCalled();
  });

  it("stops reporting after unmounting", () => {
    useAuth.mockReturnValue({ isAuth: true });
    const renderedClientErrorReporter = render(<ClientErrorReporter />);

    renderedClientErrorReporter.unmount();
    dispatchUnhandledRejection(new Error("After unmount"));

    expect(reportClientError).not.toHaveBeenCalled();
  });
});
