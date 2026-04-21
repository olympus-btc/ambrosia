export function parseUtcDate(dateString) {
  if (!dateString) return new Date(NaN);
  if (/^\d+$/.test(String(dateString))) return new Date(parseInt(dateString, 10));
  const s = String(dateString);
  if (s.includes("T") && !s.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(s)) {
    return new Date(s + "Z");
  }
  return new Date(s);
}

const formatDate = (dateString) => {
  const date = parseUtcDate(dateString);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default formatDate;
