"use client";

import { useCallback, useMemo, useReducer } from "react";

import {
  initialPaymentState,
  paymentStateReducer,
  createErrorNotifier,
} from "../utils/paymentState";

export function usePaymentState() {
  const [{ isPaying, error: paymentError }, dispatch] = useReducer(
    paymentStateReducer,
    initialPaymentState,
  );

  const notifyError = useMemo(() => createErrorNotifier(dispatch), []);
  const clearPaymentError = useCallback(() => dispatch({ type: "clearError" }), []);

  return { isPaying, paymentError, dispatch, notifyError, clearPaymentError };
}
