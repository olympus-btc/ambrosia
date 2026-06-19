import { addToast } from "@heroui/react";

import {
  initialPaymentState,
  paymentStateReducer,
  createErrorNotifier,
} from "../paymentState";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

describe("paymentState", () => {
  it("transitions state for start/stop/error/clearError", () => {
    let state = paymentStateReducer(initialPaymentState, { type: "start" });
    expect(state).toEqual({ isPaying: true, error: "" });

    state = paymentStateReducer(state, { type: "error", payload: "boom" });
    expect(state).toEqual({ isPaying: false, error: "boom" });

    state = paymentStateReducer(state, { type: "clearError" });
    expect(state).toEqual({ isPaying: false, error: "" });

    state = paymentStateReducer(state, { type: "stop" });
    expect(state).toEqual({ isPaying: false, error: "" });

    const unchanged = paymentStateReducer(state, { type: "unknown" });
    expect(unchanged).toBe(state);
  });

  it("notifies error with toast", () => {
    const dispatch = jest.fn();
    const notifyError = createErrorNotifier(dispatch);

    notifyError("payment-error");

    expect(dispatch).toHaveBeenCalledWith({ type: "error", payload: "payment-error" });
    expect(addToast).toHaveBeenCalledWith({
      color: "danger",
      description: "payment-error",
    });
  });
});
