export function formatFiat({
  value,
  currencyAcronym,
  locale,
}) {
  try {
    return new Intl.NumberFormat(locale || "en-US", {
      style: "currency",
      currency: currencyAcronym || "USD",
    }).format(value);
  } catch {
    return `${currencyAcronym || "USD"} ${value.toFixed(2)}`;
  }
}
