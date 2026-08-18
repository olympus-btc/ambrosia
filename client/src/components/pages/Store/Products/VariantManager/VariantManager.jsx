"use client";
import { useState } from "react";

import { addToast, Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { useUpload } from "@/components/hooks/useUpload";
import { isStockTracked } from "@/components/pages/Store/utils/productStockStatus";
import { resolveImageUrl } from "@/components/pages/Store/utils/resolveImageUrl";

import { OptionTypeManager } from "./OptionTypeManager";
import { VariantCard } from "./VariantCard";
import { VariantForm } from "./VariantForm";

export function VariantManager({
  product,
  variantActions,
  optionTypeActions,
  onRefresh,
}) {
  const productsTranslations = useTranslations("products");
  const { currency } = useCurrency();
  const { upload, isUploading } = useUpload();
  const [isAddingNewVariant, setIsAddingNewVariant] = useState(false);
  const [variantIdsInProgress, setVariantIdsInProgress] = useState(new Set());
  const productId = product?.id;
  const variants = product?.variants ?? [];
  const options = product?.options ?? [];
  const isStockTrackedForProduct = isStockTracked(product ?? {});

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

  const notifyVariantSuccess = (toastDescriptionKey) => {
    addToast({
      description: productsTranslations(toastDescriptionKey),
      color: "success",
    });
  };

  const buildVariantRequest = async (variantFormData) => ({
    SKU: variantFormData.SKU,
    priceCents: variantFormData.priceCents,
    quantity: variantFormData.quantity,
    isActive: variantFormData.isActive,
    optionValueIds: variantFormData.optionValueIds,
    imageUrl: await resolveImageUrl(
      {
        imageFile: variantFormData.imageFile,
        imageRemoved: variantFormData.imageRemoved,
        imageUrl: variantFormData.imageUrl,
      },
      upload,
    ),
  });

  const handleAddVariant = (variantFormData) => executeVariantMutation("new", async () => {
    const variantRequest = await buildVariantRequest(variantFormData);
    const createdVariantId = await variantActions.add(productId, variantRequest);
    if (createdVariantId !== null) {
      setIsAddingNewVariant(false);
      notifyVariantSuccess("toasts.variantCreateSuccess");
    }
    return createdVariantId;
  });

  const handleUpdateVariant = (variantId, variantFormData) => executeVariantMutation(variantId, async () => {
    const variantRequest = await buildVariantRequest(variantFormData);
    const variantWasUpdated = await variantActions.update(productId, variantId, variantRequest);
    if (variantWasUpdated) notifyVariantSuccess("toasts.variantUpdateSuccess");
    return variantWasUpdated;
  });

  const handleDeleteVariant = (variantId) => executeVariantMutation(variantId, async () => {
    const variantWasDeleted = await variantActions.delete(productId, variantId);
    if (variantWasDeleted) notifyVariantSuccess("toasts.variantDeleteSuccess");
    return variantWasDeleted;
  });

  const isAddFormMutating = variantIdsInProgress.has("new") || isUploading;

  return (
    <div className="space-y-4">
      <OptionTypeManager
        productId={productId}
        optionTypes={options}
        optionTypeActions={optionTypeActions}
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
              isStockTrackedForProduct={isStockTrackedForProduct}
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
              isStockTrackedForProduct={isStockTrackedForProduct}
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
