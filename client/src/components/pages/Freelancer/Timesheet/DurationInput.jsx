"use client";
import { useState } from "react";

import { Input } from "@heroui/react";
import { ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { useDurationDrag } from "./hooks/useDurationDrag";
import { formatDuration, parseDurationInput, QUARTER_HOUR_MINUTES } from "./utils/quarterHour";

const PIXELS_PER_QUARTER_HOUR = 12;

function toDurationText(durationMinutes) {
  return durationMinutes ? formatDuration(durationMinutes) : "";
}

export function DurationInput({ durationMinutes, onDurationChange, isReadOnly = false }) {
  const timesheetTranslations = useTranslations("timesheet");
  const [durationText, setDurationText] = useState(toDurationText(durationMinutes));
  const [isDurationInvalid, setIsDurationInvalid] = useState(false);
  const currentDurationMinutes = parseDurationInput(durationText) ?? QUARTER_HOUR_MINUTES;

  const handleDurationCommit = (committedDurationMinutes) => {
    setIsDurationInvalid(false);
    setDurationText(formatDuration(committedDurationMinutes));
    onDurationChange(committedDurationMinutes);
  };

  const { displayedDurationMinutes, isDragging, dragHandleProps } = useDurationDrag({
    durationMinutes: currentDurationMinutes,
    pixelsPerQuarterHour: PIXELS_PER_QUARTER_HOUR,
    onDurationCommit: handleDurationCommit,
    isDisabled: isReadOnly,
  });

  const handleChange = (changeEvent) => {
    const nextDurationText = changeEvent.target.value;
    setDurationText(nextDurationText);
    onDurationChange(parseDurationInput(nextDurationText));
  };

  const handleBlur = () => {
    const parsedDurationMinutes = parseDurationInput(durationText);
    setIsDurationInvalid(parsedDurationMinutes === null && durationText.trim() !== "");
    if (parsedDurationMinutes !== null) {
      setDurationText(formatDuration(parsedDurationMinutes));
    }
  };

  return (
    <div>
      <Input
        label={timesheetTranslations("modal.durationLabel")}
        placeholder={timesheetTranslations("modal.durationPlaceholder")}
        inputMode="decimal"
        isRequired={!isReadOnly}
        isInvalid={isDurationInvalid}
        value={isDragging ? formatDuration(displayedDurationMinutes) : durationText}
        onChange={handleChange}
        onBlur={handleBlur}
        isReadOnly={isReadOnly}
        classNames={isReadOnly
          ? { inputWrapper: "bg-transparent shadow-none px-0 rounded-none border-b border-gray-100 data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent", input: "font-semibold text-green-800" }
          : { inputWrapper: "rounded-b-none" }}
      />
      {!isReadOnly && (
        <>
          <div
            {...dragHandleProps}
            aria-label={timesheetTranslations("modal.adjustDuration")}
            className={`flex h-7 w-full cursor-ns-resize touch-none select-none items-center justify-center gap-1 rounded-b-medium bg-green-800 text-tiny font-medium text-white transition-opacity focus:outline-none focus:ring-2 focus:ring-green-800 focus:ring-offset-2 ${
              isDragging ? "opacity-hover" : "hover:opacity-hover"
            }`}
          >
            <ChevronsUpDown aria-hidden="true" className="w-3.5 h-3.5" />
            <span>{timesheetTranslations("modal.dragToAdjust")}</span>
          </div>
          <p className={`px-1 pt-1 text-tiny ${isDurationInvalid ? "text-danger" : "text-foreground-400"}`}>
            {isDurationInvalid
              ? timesheetTranslations("modal.durationInvalid")
              : timesheetTranslations("modal.durationHint")}
          </p>
        </>
      )}
    </div>
  );
}
