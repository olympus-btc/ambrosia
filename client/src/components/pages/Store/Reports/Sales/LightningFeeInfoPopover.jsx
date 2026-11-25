import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { Info } from "lucide-react";

import { AmountDisplay } from "@/components/shared/AmountDisplay";

export function LightningFeeInfoPopover({
  label,
  feeSat,
  infoText,
  exchangeRateAtSale,
  exchangeRateCurrency,
  currentRate,
  className = "text-gray-400",
}) {
  if (!(feeSat > 0)) return null;

  return (
    <Popover placement="top">
      <PopoverTrigger>
        <button type="button" aria-label={label} className={className}>
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs">
        <div className="space-y-1 p-2">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <AmountDisplay
            satoshis={feeSat}
            exchangeRateAtSale={exchangeRateAtSale}
            exchangeRateCurrency={exchangeRateCurrency}
            currentRate={currentRate}
          />
          <p className="text-xs text-gray-500">{infoText}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
