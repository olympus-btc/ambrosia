"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

function calculateHistoricalCents(fiatAmountAtPayment, exchangeRateAtSale, satoshis) {
  if (fiatAmountAtPayment != null) return fiatAmountAtPayment * 100;
  if (exchangeRateAtSale != null) return (satoshis / 100_000_000) * exchangeRateAtSale * 100;
  return null;
}

function AnimatedClockButton({ showingHistorical, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex items-center p-2 -m-2"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={showingHistorical ? "text-primary" : "text-foreground-400"}
      >
        <circle cx="12" cy="12" r="10" />
        <line
          x1="12"
          y1="12"
          x2="12"
          y2="6"
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 100%",
            transform: `rotate(${showingHistorical ? -720 : 0}deg)`,
            transition: "transform 0.55s ease-out",
          }}
        />
        <line
          x1="12"
          y1="12"
          x2="15.5"
          y2="12"
          strokeWidth="2.5"
          style={{
            transformBox: "fill-box",
            transformOrigin: "0% 50%",
            transform: `rotate(${showingHistorical ? -180 : 0}deg)`,
            transition: "transform 0.7s ease-in-out",
          }}
        />
      </svg>
    </button>
  );
}

export function AmountDisplay({
  satoshis,
  exchangeRateAtSale,
  exchangeRateCurrency,
  fiatAmountAtPayment,
  currentRate,
}) {
  const [showSats, setShowSats] = useState(false);
  const [showCurrentFiat, setShowCurrentFiat] = useState(false);
  const { formatAmount, currency } = useCurrency();
  const t = useTranslations("amountDisplay");

  if (!satoshis) return null;

  if (showSats) {
    return (
      <button
        type="button"
        onClick={() => setShowSats(false)}
        className="tabular-nums"
      >
        {satoshis.toLocaleString()} {t("satsLabel")}
      </button>
    );
  }

  const historicalCents = calculateHistoricalCents(fiatAmountAtPayment, exchangeRateAtSale, satoshis);

  const currentFiatCents = currentRate != null
    ? (satoshis / 100_000_000) * currentRate * 100
    : null;

  const displayCents = showCurrentFiat ? currentFiatCents : (historicalCents ?? currentFiatCents);
  const canToggleRate = historicalCents != null && currentFiatCents != null;

  const currentCurrencyAcronym = currency?.acronym?.toUpperCase();
  const displayedCurrencyAcronym = showCurrentFiat
    ? currentCurrencyAcronym
    : (exchangeRateCurrency?.toUpperCase() ?? currentCurrencyAcronym);

  return (
    <div>
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => setShowSats(true)}
          className="tabular-nums"
        >
          {displayCents != null ? formatAmount(displayCents) : "—"}
        </button>
        {displayedCurrencyAcronym && (
          <span className="text-xs font-normal text-foreground-400">{displayedCurrencyAcronym}</span>
        )}
        {canToggleRate && (
          <AnimatedClockButton
            showingHistorical={!showCurrentFiat}
            onClick={() => setShowCurrentFiat((prev) => !prev)}
            ariaLabel={showCurrentFiat ? t("showHistoricalRate") : t("showCurrentRate")}
          />
        )}
      </span>
      {displayCents != null && (
        <p className="text-xs font-normal text-deep mt-0.5">
          {canToggleRate
            ? (showCurrentFiat ? t("amountAtCurrentRate") : t("amountAtTimeOfPayment"))
            : historicalCents != null
              ? t("amountAtTimeOfPayment")
              : t("amountAtCurrentRate")}
        </p>
      )}
    </div>
  );
}
