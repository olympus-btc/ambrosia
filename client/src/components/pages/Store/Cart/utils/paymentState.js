import { addToast } from "@heroui/react";

export const initialPaymentState = {
  isPaying: false,
  error: "",
};

export function paymentStateReducer(state, action) {
  switch (action.type) {
    case "start":
      return { ...state, isPaying: true, error: "" };
    case "stop":
      return { ...state, isPaying: false };
    case "error":
      return { ...state, isPaying: false, error: action.payload };
    case "clearError":
      return { ...state, error: "" };
    default:
      return state;
  }
}

export function createErrorNotifier(dispatch) {
  return (message) => {
    dispatch({ type: "error", payload: message });
    addToast({
      color: "danger",
      description: message,
    });
  };
}
