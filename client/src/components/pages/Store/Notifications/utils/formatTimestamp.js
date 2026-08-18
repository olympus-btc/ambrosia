export function formatTimestamp(timestampValue) {
  if (!timestampValue) return "";
  const date = new Date(timestampValue);
  if (Number.isNaN(date.getTime())) return timestampValue;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
