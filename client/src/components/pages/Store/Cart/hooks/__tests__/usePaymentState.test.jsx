import { act } from "react";

import { addToast } from "@heroui/react";
import { renderHook } from "@testing-library/react";

import { usePaymentState } from "../usePaymentState";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

describe("usePaymentState", () => {
  beforeEach(() => {
    addToast.mockClear();
  });

  it("starts idle without an error", () => {
    const { result } = renderHook(() => usePaymentState());

    expect(result.current.isPaying).toBe(false);
    expect(result.current.paymentError).toBe("");
  });

  it("toggles isPaying via dispatch start/stop", () => {
    const { result } = renderHook(() => usePaymentState());

    act(() => {
      result.current.dispatch({ type: "start" });
    });
    expect(result.current.isPaying).toBe(true);

    act(() => {
      result.current.dispatch({ type: "stop" });
    });
    expect(result.current.isPaying).toBe(false);
  });

  it("sets the error and toasts when notifyError is called", () => {
    const { result } = renderHook(() => usePaymentState());

    act(() => {
      result.current.notifyError("boom");
    });

    expect(result.current.paymentError).toBe("boom");
    expect(addToast).toHaveBeenCalledWith({
      color: "danger",
      description: "boom",
    });
  });

  it("clears the error with clearPaymentError", () => {
    const { result } = renderHook(() => usePaymentState());

    act(() => {
      result.current.notifyError("boom");
    });
    expect(result.current.paymentError).toBe("boom");

    act(() => {
      result.current.clearPaymentError();
    });
    expect(result.current.paymentError).toBe("");
  });
});
