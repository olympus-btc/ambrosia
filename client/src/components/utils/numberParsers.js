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

export const isPriceStepAligned = (price, priceStep) => {
  if (!Number.isFinite(price) || !Number.isFinite(priceStep) || priceStep <= 0) return true;
  const stepCount = price / priceStep;
  return Math.abs(stepCount - Math.round(stepCount)) < 1e-6;
};
