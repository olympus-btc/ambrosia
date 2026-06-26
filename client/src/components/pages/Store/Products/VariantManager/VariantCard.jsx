"use client";
import { useState } from "react";

import { Button, Card, CardBody, Image } from "@heroui/react";
import { ImageIcon, Pencil, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { storedAssetUrl } from "@/components/utils/storedAssetUrl";
import { deriveVariantDisplayName } from "@/components/pages/Store/utils/variantUtils";

import { VariantForm } from "./VariantForm";

export function VariantCard({ variant, currency, options, onSave, onDelete, isProcessing }) {
  const productsTranslations = useTranslations("products");
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleSaveEdit = async (variantFormData) => {
    await onSave(variant.id, variantFormData);
    setIsEditing(false);
  };

  const imageUrl = storedAssetUrl(variant.imageUrl);
  const price = `${currency?.acronym ?? "$"}${(variant.priceCents / 100).toFixed(2)}`;
  const displayName = deriveVariantDisplayName(variant.optionValueIds, options) ?? variant.SKU ?? "—";

  if (isEditing) {
    return (
      <VariantForm
        initial={variant}
        currency={currency}
        options={options}
        onSave={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
        isLoading={isProcessing}
      />
    );
  }

  return (
    <Card shadow="none" className="border border-gray-200 bg-white">
      <CardBody className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={variant.SKU ?? "variant"}
                removeWrapper
                className="w-full h-full object-cover rounded-none"
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-gray-300" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {displayName}
            </p>
            {variant.SKU && (
              <p className="text-xs text-gray-400 truncate">{variant.SKU}</p>
            )}
            <p className="text-xs text-gray-500">
              {price} · {variant.quantity} {productsTranslations("variantStockUnit")}
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {isConfirmingDelete ? (
              <>
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  onPress={() => onDelete(variant.id)}
                  isLoading={isProcessing}
                >
                  {productsTranslations("deleteVariantConfirm")}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                  aria-label={productsTranslations("cancelVariant")}
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
