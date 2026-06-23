import { useState, useRef } from "react";

import { closeToast } from "@heroui/react";

export function usePendingRemoval() {
  const [pendingRemovals, setPendingRemovals] = useState(new Set());
  const timers = useRef({});
  const toastKeys = useRef({});

  const removeFromPending = (itemId) => {
    setPendingRemovals((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const dismissToast = (itemId) => {
    const toastKey = toastKeys.current[itemId];
    if (toastKey) {
      closeToast(toastKey);
      delete toastKeys.current[itemId];
    }
  };

  const clearTimer = (itemId) => {
    clearTimeout(timers.current[itemId]);
    delete timers.current[itemId];
  };

  const startRemoval = (itemId, onConfirm, toastKey) => {
    toastKeys.current[itemId] = toastKey;
    setPendingRemovals((prev) => new Set([...prev, itemId]));
    timers.current[itemId] = setTimeout(() => {
      onConfirm();
      delete timers.current[itemId];
      dismissToast(itemId);
      removeFromPending(itemId);
    }, 5000);
  };

  const cancelRemoval = (itemId) => {
    clearTimer(itemId);
    dismissToast(itemId);
    removeFromPending(itemId);
  };

  const clearPendingRemovals = () => {
    Object.values(timers.current).forEach((timer) => clearTimeout(timer));
    Object.values(toastKeys.current).forEach((toastKey) => closeToast(toastKey));
    timers.current = {};
    toastKeys.current = {};
    setPendingRemovals(new Set());
  };

  return { pendingRemovals, startRemoval, cancelRemoval, clearPendingRemovals };
}
