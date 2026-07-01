"use client";

import { NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

export function ProductPricingFields({ data, onChange, currency }) {
  const productsTranslations = useTranslations("products");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <NumberInput
        label={productsTranslations("modal.productPriceLabel")}
        placeholder={productsTranslations("modal.productPricePlaceholder")}
        isRequired
        errorMessage={productsTranslations("modal.errorMsgInputFieldEmpty")}
        startContent={(
          <span className="text-default-400 text-small">
            {currency?.acronym || "$"}
          </span>
        )}
        minValue={0}
        value={data.productPrice}
        onValueChange={(priceValue) => {
          const productPrice = priceValue === null ? "" : Number(priceValue);
          onChange({ productPrice });
        }}
        min={0}
        step={0.01}
      />

      <NumberInput
        label={productsTranslations("modal.productStockLabel")}
        placeholder={productsTranslations("modal.productStockPlaceholder")}
        value={data.productStock}
        minValue={0}
        maxValue={1000000}
        isRequired
        errorMessage={productsTranslations("modal.errorMsgInputFieldEmpty")}
        onValueChange={(stockValue) => {
          const productStock = stockValue === null ? "" : Number(stockValue);
          onChange({ productStock });
        }}
        min={0}
        step={1}
      />
    </div>
  );
}
