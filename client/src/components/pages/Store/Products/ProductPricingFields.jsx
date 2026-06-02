"use client";

import { NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

export function ProductPricingFields({ data, onChange, currency }) {
  const t = useTranslations("products");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <NumberInput
        label={t("modal.productPriceLabel")}
        placeholder={t("modal.productPricePlaceholder")}
        isRequired
        errorMessage={t("modal.errorMsgInputFieldEmpty")}
        startContent={
          <span className="text-default-400 text-small">
            {currency?.acronym || "$"}
          </span>
        }
        minValue={0}
        value={data.productPrice}
        onValueChange={(value) => {
          const numeric = value === null ? "" : Number(value);
          onChange({ productPrice: numeric });
        }}
        min={0}
        step={0.01}
      />

      <NumberInput
        label={t("modal.productStockLabel")}
        placeholder={t("modal.productStockPlaceholder")}
        value={data.productStock}
        minValue={0}
        maxValue={1000000}
        isRequired
        errorMessage={t("modal.errorMsgInputFieldEmpty")}
        onValueChange={(value) => {
          const numeric = value === null ? "" : Number(value);
          onChange({ productStock: numeric });
        }}
        min={0}
        step={1}
      />
    </div>
  );
}
