"use client";

import { Clock, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatDuration } from "./utils/quarterHour";

export function TimeEntryCard({ timeEntry, onView }) {
  const timesheetTranslations = useTranslations("timesheet");

  return (
    <article
      data-testid="time-entry-card"
      data-locked={timeEntry.isLocked}
      title={timeEntry.isLocked ? timesheetTranslations("lockedEntry") : undefined}
      className={`overflow-hidden rounded-lg shadow-sm transition-shadow hover:shadow-md ${
        timeEntry.isLocked ? "bg-gray-50 text-gray-500" : "bg-white text-green-900"
      }`}
    >
      <button
        type="button"
        className="block w-full cursor-pointer px-2.5 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-green-800 focus-visible:ring-inset"
        onClick={() => onView(timeEntry)}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 min-w-0 text-sm font-semibold leading-snug break-words">{timeEntry.taskName}</p>
          {timeEntry.isLocked && (
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-label={timesheetTranslations("lockedEntry")} />
          )}
        </div>
        <p
          className={`mt-1.5 flex items-center gap-1 text-base font-bold tabular-nums ${
            timeEntry.isLocked ? "text-gray-500" : "text-green-800"
          }`}
          data-testid="time-entry-duration"
        >
          <Clock aria-hidden="true" className="h-3.5 w-3.5 opacity-70" />
          {formatDuration(timeEntry.durationMinutes)}
        </p>
      </button>
    </article>
  );
}
