const padTwoDigits = (number) => String(number).padStart(2, "0");

const dateFormatters = {
  DAY_MONTH_YEAR: ({ day, month, year }) => `${day}/${month}/${year}`,
  MONTH_DAY_YEAR: ({ day, month, year }) => `${month}/${day}/${year}`,
  YEAR_MONTH_DAY: ({ day, month, year }) => `${year}-${month}-${day}`,
};

const timeFormatters = {
  HOURS_24: ({ hours, minutes }) => `${padTwoDigits(hours)}:${minutes}`,
  HOURS_12: ({ hours, minutes }) => {
    const meridiem = hours < 12 ? "AM" : "PM";
    const twelveHour = hours % 12 || 12;
    return `${twelveHour}:${minutes} ${meridiem}`;
  },
};

export function formatPrintDate(printedAt, dateFormat) {
  const formatDate = dateFormatters[dateFormat] || dateFormatters.DAY_MONTH_YEAR;
  return formatDate({
    day: padTwoDigits(printedAt.getDate()),
    month: padTwoDigits(printedAt.getMonth() + 1),
    year: String(printedAt.getFullYear()),
  });
}

export function formatPrintTime(printedAt, timeFormat) {
  const formatTime = timeFormatters[timeFormat] || timeFormatters.HOURS_24;
  return formatTime({
    hours: printedAt.getHours(),
    minutes: padTwoDigits(printedAt.getMinutes()),
  });
}
