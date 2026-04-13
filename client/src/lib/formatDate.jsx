const formatDate = (dateString) => {
  const date = dateString?.includes("T") || dateString?.includes("Z")
    ? new Date(dateString)
    : new Date(parseInt(dateString, 10));

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
