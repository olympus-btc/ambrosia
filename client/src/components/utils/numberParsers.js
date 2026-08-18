export const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toNumberInputValue = (changeArgument, fallback = 0) => {
  const rawValue = typeof changeArgument === "object" && changeArgument?.target
    ? changeArgument.target.value.replace(/[^0-9.-]/g, "")
    : changeArgument;

  if (rawValue === "" || rawValue === null || rawValue === undefined) return fallback;

  return toFiniteNumber(rawValue, fallback);
};
