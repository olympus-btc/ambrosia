export function parseDateValue(dateString) {
  if (!dateString) return new Date(NaN);
  if (/^\d+$/.test(String(dateString))) return new Date(parseInt(dateString, 10));
  return new Date(String(dateString));
}

const formatDate = (dateString) => {
  const parsedDate = parseDateValue(dateString);
  if (isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default formatDate;

export const formatDateParts = (dateString) => {
  const parsedDate = parseDateValue(dateString);
  if (isNaN(parsedDate.getTime())) return { localDay: "", date: "-", time: "" };
  return {
    get localDay() {
      return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
    },
    get date() {
      return parsedDate.toLocaleString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
    },
    get time() {
      return parsedDate.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });
    },
  };
};
