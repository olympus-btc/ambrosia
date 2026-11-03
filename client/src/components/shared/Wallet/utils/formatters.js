export const formatSats = (amountSat) => (amountSat == null ? "—" : new Intl.NumberFormat().format(amountSat));

export function formatFiat({
  fiatAmount,
  currencyAcronym,
  locale,
}) {
  try {
    return new Intl.NumberFormat(locale || "en-US", {
      style: "currency",
      currency: currencyAcronym || "USD",
    }).format(fiatAmount);
  } catch {
    return `${currencyAcronym || "USD"} ${fiatAmount.toFixed(2)}`;
  }
}
