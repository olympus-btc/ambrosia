"use client";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { useVariantSelector } from "@/components/pages/Store/Cart/hooks/useVariantSelector";

function getOptionValueButtonClassName(optionValueIsAvailable, optionValueIsSelected) {
  const unavailableClassName = "opacity-40 border-dashed cursor-not-allowed";
  return `min-h-[44px] px-4 transition-opacity ${
    !optionValueIsAvailable && !optionValueIsSelected ? unavailableClassName : ""
  }`;
}

export function VariantSelectorModal({ product, isOpen, onClose, onAddToCart }) {
  const cartTranslations = useTranslations("cart");
  const { formatAmount } = useCurrency();
  const {
    options,
    isLoading,
    selectedValues,
    allSelected,
    isDisabled,
    matchedVariant,
    isOutOfStock,
    isValueAvailable,
    toggleOptionValue,
    handleAddToCart,
  } = useVariantSelector({ product, isOpen, onClose, onAddToCart });

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" size="sm">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <span>{cartTranslations("variantSelector.title")}</span>
          <span className="text-sm font-normal text-gray-500">{product?.name}</span>
        </ModalHeader>
        <ModalBody>
          {isLoading && (
            <p className="text-center text-gray-400 py-4">{cartTranslations("variantSelector.loading")}</p>
          )}
          {!isLoading && options.map((optionType) => (
            <div key={optionType.id} className="flex flex-col gap-2">
              <p className="text-sm font-medium">{optionType.name}</p>
              <div className="flex flex-wrap gap-2">
                {optionType.values.map((optionValue) => {
                  const optionValueIsSelected = selectedValues[optionType.id] === optionValue.id;
                  const optionValueIsAvailable = isValueAvailable(optionType, optionValue.id);
                  return (
                    <Button
                      key={optionValue.id}
                      size="sm"
                      variant={optionValueIsSelected ? "solid" : "bordered"}
                      color={optionValueIsSelected ? "primary" : "default"}
                      className={getOptionValueButtonClassName(optionValueIsAvailable, optionValueIsSelected)}
                      onPress={() => toggleOptionValue(optionType.id, optionValue.id)}
                    >
                      {optionValue.value}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
          {allSelected && !matchedVariant && (
            <p className="text-sm text-rose-600 text-center pt-1">
              {cartTranslations("variantSelector.noVariantFound")}
            </p>
          )}
          {matchedVariant && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-lg font-bold text-green-800">
                {formatAmount(matchedVariant.priceCents)}
              </span>
              <span className={`text-sm ${isOutOfStock ? "text-rose-600" : "text-gray-500"}`}>
                {isOutOfStock
                  ? cartTranslations("variantSelector.outOfStock")
                  : `${matchedVariant.quantity} ${cartTranslations("variantSelector.inStock")}`}
              </span>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted transition-colors"
            onPress={onClose}
          >
            {cartTranslations("variantSelector.cancel")}
          </Button>
          <Button color="primary" isDisabled={isDisabled} onPress={handleAddToCart}>
            {cartTranslations("variantSelector.addToCart")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
