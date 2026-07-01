"use client";
import { useState } from "react";

import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { useUpload } from "@/components/hooks/useUpload";

import { resolveImageUrl } from "../utils/resolveImageUrl";

import { OptionTypeManager } from "./OptionTypeManager";
import { VariantCard } from "./VariantCard";
import { VariantForm } from "./VariantForm";

export function VariantManager({
  productId,
  variants = [],
  options = [],
  onAddVariant,
  onUpdateVariant,
  onDeleteVariant,
  onAddOptionType,
  onUpdateOptionType,
  onDeleteOptionType,
  onRefresh,
}) {
  const productsTranslations = useTranslations("products");
  const { currency } = useCurrency();
  const { upload, isUploading } = useUpload();
  const [isAddingNewVariant, setIsAddingNewVariant] = useState(false);
  const [variantIdsInProgress, setVariantIdsInProgress] = useState(new Set());

  const setVariantMutating = (variantId, isMutating) => {
    setVariantIdsInProgress((previousVariantIdsInProgress) => {
      const updatedVariantIdsInProgress = new Set(previousVariantIdsInProgress);
      if (isMutating) {
        updatedVariantIdsInProgress.add(variantId);
      } else {
        updatedVariantIdsInProgress.delete(variantId);
      }
      return updatedVariantIdsInProgress;
    });
  };

  const executeVariantMutation = async (variantId, variantMutation) => {
    setVariantMutating(variantId, true);
    try {
      const mutationResult = await variantMutation();
      if (mutationResult !== false && mutationResult !== null) await onRefresh?.();
      return mutationResult;
    } finally {
      setVariantMutating(variantId, false);
    }
  };

  const buildVariantRequest = async (variantFormData) => ({
    SKU: variantFormData.SKU,
    priceCents: variantFormData.priceCents,
    quantity: variantFormData.quantity,
    isActive: variantFormData.isActive,
    optionValueIds: variantFormData.optionValueIds,
    imageUrl: await resolveImageUrl(variantFormData.imageFile, variantFormData.imageUrl, upload),
  });

  const handleAddVariant = (variantFormData) => executeVariantMutation("new", async () => {
    const variantRequest = await buildVariantRequest(variantFormData);
    const createdVariantId = await onAddVariant(productId, variantRequest);
    if (createdVariantId !== null) setIsAddingNewVariant(false);
    return createdVariantId;
  });

  const handleUpdateVariant = (variantId, variantFormData) => executeVariantMutation(variantId, async () => {
    const variantRequest = await buildVariantRequest(variantFormData);
    return onUpdateVariant(productId, variantId, variantRequest);
  });

  const handleDeleteVariant = (variantId) => executeVariantMutation(variantId, () => onDeleteVariant(productId, variantId));

  const isAddFormMutating = variantIdsInProgress.has("new") || isUploading;

  return (
    <div className="space-y-4">
      <OptionTypeManager
        productId={productId}
        options={options}
        onAddOptionType={onAddOptionType}
        onUpdateOptionType={onUpdateOptionType}
        onDeleteOptionType={onDeleteOptionType}
        onRefresh={onRefresh}
      />

      <div className="border-t border-gray-100 pt-3 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-gray-700">{productsTranslations("variants")}</span>
          {!isAddingNewVariant && (
            <Button
              size="sm"
              variant="flat"
              startContent={<Plus className="w-3.5 h-3.5" />}
              onPress={() => setIsAddingNewVariant(true)}
              isDisabled={options.length === 0}
            >
              {productsTranslations("addVariant")}
            </Button>
          )}
        </div>

        {options.length === 0 && (
          <p className="text-xs text-amber-600">{productsTranslations("noOptionTypesWarning")}</p>
        )}

        {variants.length === 0 && !isAddingNewVariant && options.length > 0 && (
          <p className="text-sm text-gray-400 py-1">{productsTranslations("noVariants")}</p>
        )}

        <div className="space-y-2">
          {variants.map((variant) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              currency={currency}
              options={options}
              onSave={handleUpdateVariant}
              onDelete={handleDeleteVariant}
              isProcessing={variantIdsInProgress.has(variant.id) || isUploading}
            />
          ))}

          {isAddingNewVariant && (
            <VariantForm
              initial={{}}
              currency={currency}
              options={options}
              onSave={handleAddVariant}
              onCancel={() => setIsAddingNewVariant(false)}
              isLoading={isAddFormMutating}
            />
          )}
        </div>
      </div>
    </div>
  );
}
