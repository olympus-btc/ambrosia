"use client";

import { Button } from "@heroui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { formatDuration } from "./utils/quarterHour";
import { formatWeekRangeLabel } from "./utils/week";

export function WeekNavigator({ weekStart, weekEnd, weekTotalMinutes, filterControl, onPreviousWeek, onNextWeek, onCurrentWeek }) {
  const activeLocale = useLocale();
  const timesheetTranslations = useTranslations("timesheet");
  const weekRangeLabel = formatWeekRangeLabel(weekStart, weekEnd, activeLocale);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex w-full flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm sm:w-auto">
        <Button
          size="sm"
          variant="outline"
          className="border border-green-800 text-green-800 w-8 h-8 min-w-0 px-0 shrink-0"
          aria-label={timesheetTranslations("previousWeek")}
          onPress={onPreviousWeek}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" className="border border-green-800 text-green-800" onPress={onCurrentWeek}>
          {timesheetTranslations("today")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border border-green-800 text-green-800 w-8 h-8 min-w-0 px-0 shrink-0"
          aria-label={timesheetTranslations("nextWeek")}
          onPress={onNextWeek}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <p className="ml-auto text-sm font-semibold text-green-900 sm:ml-2 md:text-base" data-testid="week-range">{weekRangeLabel}</p>
        {filterControl}
      </div>
      <p className="flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm text-gray-800 shadow-sm sm:w-auto">
        <span>{timesheetTranslations("weekTotal")}:</span>
        <span className="font-mono text-lg font-semibold text-green-900" data-testid="week-total">
          {formatDuration(weekTotalMinutes)}
        </span>
      </p>
    </div>
  );
}
