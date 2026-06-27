"use client";

import { useCallback, useEffect, useState } from "react";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { useProductVariants } from "@/components/pages/Store/hooks/useProductVariants";
import { deriveVariantDisplayName, findMatchingVariant } from "@/components/pages/Store/utils/variantUtils";

export function VariantSelectorModal({ product, isOpen, onClose, onAddToCart }) {
  const t = useTranslations("cart");
  const { formatAmount } = useCurrency();
  const { fetchProductDetail } = useProductVariants();

  const [productDetail, setProductDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedValues, setSelectedValues] = useState({});

  useEffect(() => {
    if (!isOpen || !product) return;
    setSelectedValues({});
    setProductDetail(null);
    setIsLoading(true);
    fetchProductDetail(product.id)
      .then((detail) => {
        setProductDetail(detail);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [isOpen, product, fetchProductDetail]);

  const toggleOptionValue = useCallback((optionTypeId, valueId) => {
    setSelectedValues((prev) => ({
      ...prev,
      [optionTypeId]: prev[optionTypeId] === valueId ? undefined : valueId,
    }));
  }, []);

  const options = productDetail?.options ?? [];
  const variants = productDetail?.variants ?? [];
  const selectedValueIds = options
    .map((opt) => selectedValues[opt.id])
    .filter(Boolean);
  const allSelected = options.length > 0 && selectedValueIds.length === options.length;
  const matchedVariant = allSelected ? findMatchingVariant(variants, selectedValueIds) : null;
  const isOutOfStock = matchedVariant ? matchedVariant.quantity <= 0 : false;
  const isDisabled = isLoading || !allSelected || !matchedVariant || isOutOfStock;

  const isValueAvailable = (optionType, valueId) => {
    const hypotheticalSelection = { ...selectedValues, [optionType.id]: valueId };
    const hypotheticalIds = options.map((opt) => hypotheticalSelection[opt.id]).filter(Boolean);
    return variants.some((variant) => {
      const ids = variant.optionValueIds ?? [];
      return hypotheticalIds.every((id) => ids.includes(id)) && variant.quantity > 0;
    });
  };

  const handleAddToCart = () => {
    if (!matchedVariant) return;
    const variantName = deriveVariantDisplayName(matchedVariant.optionValueIds, options);
    onAddToCart(product, { ...matchedVariant, _variantName: variantName });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <span>{t("variantSelector.title")}</span>
          <span className="text-sm font-normal text-gray-500">{product?.name}</span>
        </ModalHeader>
        <ModalBody>
          {isLoading && (
            <p className="text-center text-gray-400 py-4">{t("variantSelector.loading")}</p>
          )}
          {!isLoading && options.map((optionType) => (
            <div key={optionType.id} className="flex flex-col gap-2">
              <p className="text-sm font-medium">{optionType.name}</p>
              <div className="flex flex-wrap gap-2">
                {optionType.values.map((val) => {
                  const selected = selectedValues[optionType.id] === val.id;
                  const available = isValueAvailable(optionType, val.id);
                  return (
                    <Button
                      key={val.id}
                      size="sm"
                      variant={selected ? "solid" : "bordered"}
                      color={selected ? "primary" : "default"}
                      className={`min-h-[44px] px-4 transition-opacity ${!available && !selected ? "opacity-40 border-dashed cursor-not-allowed" : ""}`}
                      onPress={() => toggleOptionValue(optionType.id, val.id)}
                    >
                      {val.value}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
          {allSelected && !matchedVariant && (
            <p className="text-sm text-rose-600 text-center pt-1">
              {t("variantSelector.noVariantFound")}
            </p>
          )}
          {matchedVariant && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-lg font-bold text-green-800">
                {formatAmount(matchedVariant.priceCents)}
              </span>
              <span className={`text-sm ${isOutOfStock ? "text-rose-600" : "text-gray-500"}`}>
                {isOutOfStock
                  ? t("variantSelector.outOfStock")
                  : `${matchedVariant.quantity} ${t("variantSelector.inStock")}`}
              </span>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            {t("variantSelector.cancel")}
          </Button>
          <Button color="primary" isDisabled={isDisabled} onPress={handleAddToCart}>
            {t("variantSelector.addToCart")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
