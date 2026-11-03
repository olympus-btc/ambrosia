"use client";

import { DayColumn } from "./DayColumn";
import { groupEntriesByDay } from "./utils/groupEntriesByDay";
import { toIsoDate } from "./utils/week";

export function WeekGrid({ weekDays, todayIsoDate, timeEntries, ...dayColumnProps }) {
  const timeEntriesByDay = groupEntriesByDay(timeEntries, weekDays);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {weekDays.map((weekDay) => (
        <DayColumn
          key={toIsoDate(weekDay)}
          day={weekDay}
          isToday={toIsoDate(weekDay) === todayIsoDate}
          timeEntries={timeEntriesByDay[toIsoDate(weekDay)]}
          {...dayColumnProps}
        />
      ))}
    </div>
  );
}
