import { AmountDisplay } from "@/components/shared/AmountDisplay";

export function LightningFeeNote({
  label,
  feeSat,
  exchangeRateAtSale,
  exchangeRateCurrency,
  currentRate,
  className = "text-xs text-gray-400",
}) {
  if (!(feeSat > 0)) return null;

  return (
    <div className={className}>
      <span>{label}: </span>
      <AmountDisplay
        satoshis={feeSat}
        exchangeRateAtSale={exchangeRateAtSale}
        exchangeRateCurrency={exchangeRateCurrency}
        currentRate={currentRate}
      />
    </div>
  );
}
