"use client";

import { NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

import { isPriceStepAligned } from "@/components/utils/numberParsers";

export function ProductPricingFields({
  productForm,
  onChange,
  currency,
  priceStep = 0.01,
  includeStock = true,
}) {
  const productsTranslations = useTranslations("products");
  const showPriceStepMismatchWarning = !isPriceStepAligned(productForm.productPrice, priceStep);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1">
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
          value={productForm.productPrice}
          onValueChange={(priceValue) => {
            const productPrice = priceValue === null ? "" : Number(priceValue);
            onChange({ productPrice });
          }}
          min={0}
          step={priceStep}
        />
        {showPriceStepMismatchWarning && (
          <p className="text-xs text-amber-600">
            {`${productsTranslations("priceStepMismatchWarning")} ${currency?.acronym || "$"} ${Number(productForm.productPrice).toFixed(2)}`}
          </p>
        )}
      </div>

      {includeStock && (
        <NumberInput
          label={productsTranslations("modal.productStockLabel")}
          placeholder={productsTranslations("modal.productStockPlaceholder")}
          value={productForm.productStock}
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
      )}
    </div>
  );
}
