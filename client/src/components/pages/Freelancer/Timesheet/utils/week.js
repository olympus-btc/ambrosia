export const DAYS_IN_WEEK = 7;

export function addDays(date, numberOfDays) {
  const shiftedDate = new Date(date);
  shiftedDate.setDate(shiftedDate.getDate() + numberOfDays);
  return shiftedDate;
}

export function getWeekStart(date) {
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (weekStart.getDay() + 6) % DAYS_IN_WEEK;
  return addDays(weekStart, -daysSinceMonday);
}

export function getWeekDays(weekStart) {
  return Array.from({ length: DAYS_IN_WEEK }, (_, dayOffset) => addDays(weekStart, dayOffset));
}

export function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatWeekdayLabel(date, activeLocale) {
  return new Intl.DateTimeFormat(activeLocale, { weekday: "short" }).format(date);
}

export function formatDayOfMonthLabel(date, activeLocale) {
  return new Intl.DateTimeFormat(activeLocale, { day: "numeric", month: "short" }).format(date);
}

export function formatWeekRangeLabel(weekStart, weekEnd, activeLocale) {
  return new Intl.DateTimeFormat(activeLocale, { day: "numeric", month: "short", year: "numeric" })
    .formatRange(weekStart, weekEnd);
}

export function formatReadableDate(isoDate, activeLocale) {
  return new Intl.DateTimeFormat(activeLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .format(parseIsoDate(isoDate));
}
