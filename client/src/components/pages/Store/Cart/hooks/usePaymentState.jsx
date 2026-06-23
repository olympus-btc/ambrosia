"use client";

import { useCallback, useMemo, useReducer } from "react";

import {
  initialPaymentState,
  paymentStateReducer,
  createErrorNotifier,
  createSuccessNotifier,
} from "../utils/paymentState";

export function usePaymentState(translate) {
  const [{ isPaying, error: paymentError }, dispatch] = useReducer(
    paymentStateReducer,
    initialPaymentState,
  );

  const notifyError = useMemo(() => createErrorNotifier(dispatch, translate), [translate]);
  const notifySuccess = useMemo(() => createSuccessNotifier(translate), [translate]);
  const clearPaymentError = useCallback(() => dispatch({ type: "clearError" }), []);

  return { isPaying, paymentError, dispatch, notifyError, notifySuccess, clearPaymentError };
}
