"use client";
import { useRef, useState } from "react";

import { MAX_DURATION_MINUTES, QUARTER_HOUR_MINUTES } from "../utils/quarterHour";

function clampDurationMinutes(durationMinutes) {
  return Math.min(MAX_DURATION_MINUTES, Math.max(QUARTER_HOUR_MINUTES, durationMinutes));
}

export function useDurationDrag({ durationMinutes, pixelsPerQuarterHour, onDurationCommit, isDisabled = false }) {
  const dragStartRef = useRef(null);
  const previewDurationMinutesRef = useRef(durationMinutes);
  const [previewDurationMinutes, setPreviewDurationMinutes] = useState(null);

  const updatePreviewDurationMinutes = (nextDurationMinutes) => {
    previewDurationMinutesRef.current = nextDurationMinutes;
    setPreviewDurationMinutes(nextDurationMinutes);
  };

  const commitDurationMinutes = (committedDurationMinutes) => {
    if (committedDurationMinutes !== durationMinutes) {
      onDurationCommit(committedDurationMinutes);
    }
  };

  const handlePointerDown = (pointerEvent) => {
    if (isDisabled) return;
    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();
    pointerEvent.currentTarget.setPointerCapture?.(pointerEvent.pointerId);
    dragStartRef.current = { pointerStartY: pointerEvent.clientY, startDurationMinutes: durationMinutes };
    updatePreviewDurationMinutes(durationMinutes);
  };

  const handlePointerMove = (pointerEvent) => {
    if (!dragStartRef.current) return;
    const { pointerStartY, startDurationMinutes } = dragStartRef.current;
    const quarterHourSteps = Math.round((pointerStartY - pointerEvent.clientY) / pixelsPerQuarterHour);
    updatePreviewDurationMinutes(clampDurationMinutes(startDurationMinutes + quarterHourSteps * QUARTER_HOUR_MINUTES));
  };

  const handlePointerUp = (pointerEvent) => {
    if (!dragStartRef.current) return;
    pointerEvent.currentTarget.releasePointerCapture?.(pointerEvent.pointerId);
    dragStartRef.current = null;
    const committedDurationMinutes = previewDurationMinutesRef.current;
    setPreviewDurationMinutes(null);
    commitDurationMinutes(committedDurationMinutes);
  };

  const handlePointerCancel = () => {
    dragStartRef.current = null;
    setPreviewDurationMinutes(null);
  };

  const handleKeyDown = (keyboardEvent) => {
    if (isDisabled) return;
    const keyboardStepsByKey = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };
    const keyboardSteps = keyboardStepsByKey[keyboardEvent.key];
    if (!keyboardSteps) return;
    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
    commitDurationMinutes(clampDurationMinutes(durationMinutes + keyboardSteps * QUARTER_HOUR_MINUTES));
  };

  return {
    displayedDurationMinutes: previewDurationMinutes ?? durationMinutes,
    isDragging: previewDurationMinutes !== null,
    dragHandleProps: {
      role: "slider",
      tabIndex: isDisabled ? -1 : 0,
      "aria-valuemin": QUARTER_HOUR_MINUTES,
      "aria-valuemax": MAX_DURATION_MINUTES,
      "aria-valuenow": previewDurationMinutes ?? durationMinutes,
      "aria-disabled": isDisabled,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onKeyDown: handleKeyDown,
      onClick: (clickEvent) => clickEvent.stopPropagation(),
    },
  };
}
