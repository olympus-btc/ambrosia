import { toIsoDate } from "./week";

export function sumDurationMinutes(timeEntries) {
  return timeEntries.reduce((totalMinutes, timeEntry) => totalMinutes + (timeEntry.durationMinutes ?? 0), 0);
}

export function groupEntriesByDay(timeEntries, weekDays) {
  const timeEntriesByDay = Object.fromEntries(weekDays.map((weekDay) => [toIsoDate(weekDay), []]));
  timeEntries.forEach((timeEntry) => {
    timeEntriesByDay[timeEntry.entryDate]?.push(timeEntry);
  });
  return timeEntriesByDay;
}
