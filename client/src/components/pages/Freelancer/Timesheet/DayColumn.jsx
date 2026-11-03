"use client";

import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { TimeEntryCard } from "./TimeEntryCard";
import { sumDurationMinutes } from "./utils/groupEntriesByDay";
import { formatDuration } from "./utils/quarterHour";
import { formatDayOfMonthLabel, formatWeekdayLabel, toIsoDate } from "./utils/week";

export function DayColumn({ day, isToday, timeEntries, canCreate, onAddEntry, onViewEntry }) {
  const activeLocale = useLocale();
  const timesheetTranslations = useTranslations("timesheet");
  const weekdayLabel = formatWeekdayLabel(day, activeLocale);
  const dayOfMonthLabel = formatDayOfMonthLabel(day, activeLocale);

  return (
    <section
      data-testid={`day-column-${toIsoDate(day)}`}
      className={`flex flex-col gap-2 lg:min-h-40 rounded-lg p-2 ${isToday ? "bg-green-50" : "bg-white"}`}
    >
      <header className="flex items-baseline justify-between border-b border-green-100 pb-1">
        <div>
          <p className="text-xs font-semibold uppercase text-green-800">{weekdayLabel}</p>
          <p className="text-sm text-gray-700">{dayOfMonthLabel}</p>
        </div>
        <p
          className="font-mono text-sm font-semibold text-green-900"
          aria-label={timesheetTranslations("dayTotal")}
          data-testid="day-total"
        >
          {formatDuration(sumDurationMinutes(timeEntries))}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-2">
        {timeEntries.length === 0 && (
          <p className="text-xs text-gray-400">{timesheetTranslations("noEntries")}</p>
        )}
        {timeEntries.map((timeEntry) => (
          <TimeEntryCard
            key={timeEntry.id}
            timeEntry={timeEntry}
            onView={onViewEntry}
          />
        ))}
      </div>

      {canCreate && (
        <Button
          size="sm"
          variant="light"
          className="text-green-800"
          startContent={<Plus className="h-4 w-4" />}
          onPress={() => onAddEntry(toIsoDate(day))}
        >
          {timesheetTranslations("addEntry")}
        </Button>
      )}
    </section>
  );
}
