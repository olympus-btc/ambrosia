export const QUARTER_HOUR_MINUTES = 15;
export const MAX_DURATION_MINUTES = 24 * 60;

const HOURS_AND_MINUTES_PATTERN = /^(\d+):([0-5]?\d)$/;
const DECIMAL_HOURS_PATTERN = /^\d*(?:[.,]\d+)?$/;

export function snapToQuarterHour(durationMinutes) {
  const roundedQuarterHours = Math.round(durationMinutes / QUARTER_HOUR_MINUTES);
  return Math.max(QUARTER_HOUR_MINUTES, roundedQuarterHours * QUARTER_HOUR_MINUTES);
}

function toValidDurationMinutes(totalMinutes) {
  if (!(totalMinutes > 0)) return null;
  const snappedDurationMinutes = snapToQuarterHour(totalMinutes);
  return snappedDurationMinutes <= MAX_DURATION_MINUTES ? snappedDurationMinutes : null;
}

export function parseDurationInput(rawDurationInput) {
  const trimmedDurationInput = String(rawDurationInput ?? "").trim();
  if (!trimmedDurationInput) return null;

  const hoursAndMinutesMatch = trimmedDurationInput.match(HOURS_AND_MINUTES_PATTERN);
  if (hoursAndMinutesMatch) {
    const [, hoursText, minutesText] = hoursAndMinutesMatch;
    return toValidDurationMinutes(Number(hoursText) * 60 + Number(minutesText));
  }

  if (DECIMAL_HOURS_PATTERN.test(trimmedDurationInput)) {
    const decimalHours = Number(trimmedDurationInput.replace(",", "."));
    return toValidDurationMinutes(decimalHours * 60);
  }

  return null;
}

export function formatDuration(durationMinutes) {
  const safeDurationMinutes = Math.max(0, Math.round(durationMinutes ?? 0));
  const hours = Math.floor(safeDurationMinutes / 60);
  const minutes = safeDurationMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}
