import { useState, useRef } from "react";

export function usePendingRemoval() {
  const [pendingRemovals, setPendingRemovals] = useState(new Set());
  const timers = useRef({});

  const startRemoval = (itemId, onConfirm) => {
    setPendingRemovals((prev) => new Set([...prev, itemId]));
    timers.current[itemId] = setTimeout(() => {
      onConfirm();
      setPendingRemovals((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      delete timers.current[itemId];
    }, 5000);
  };

  const cancelRemoval = (itemId) => {
    clearTimeout(timers.current[itemId]);
    delete timers.current[itemId];
    setPendingRemovals((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  return { pendingRemovals, startRemoval, cancelRemoval };
}
