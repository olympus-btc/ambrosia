"use client";
import { useState } from "react";

import { Button, Input, NumberInput, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

import { ImageUploader } from "@/components/shared/ImageUploader";

function buildInitialOptionValuesByType(options, initialOptionValueIds = []) {
  return options.reduce((selectedOptionValueIdsByType, optionType) => {
    const matchedOptionValue = optionType.values.find((optionValue) => initialOptionValueIds.includes(optionValue.id));
    if (!matchedOptionValue) return selectedOptionValueIdsByType;
    return {
      ...selectedOptionValueIdsByType,
      [optionType.id]: matchedOptionValue.id,
    };
  }, {});
}

export function VariantForm({ initial = {}, currency, options = [], onSave, onCancel, isLoading }) {
  const productsTranslations = useTranslations("products");

  const [form, setForm] = useState({
    SKU: initial.SKU ?? "",
    priceCents: initial.priceCents ?? 0,
    quantity: initial.quantity ?? 0,
    imageFile: null,
    imageUrl: initial.imageUrl ?? null,
    imageRemoved: false,
    selectedOptionValues: buildInitialOptionValuesByType(options, initial.optionValueIds),
  });

  const updateForm = (formUpdates) => {
    setForm((previousForm) => ({ ...previousForm, ...formUpdates }));
  };

  const handleImageChange = (file) => {
    if (file === null) {
      updateForm({ imageFile: null, imageUrl: null, imageRemoved: true });
    } else {
      updateForm({ imageFile: file, imageRemoved: false });
    }
  };

  const handleOptionValueChange = (optionTypeId, valueId) => {
    setForm((previousForm) => ({
      ...previousForm,
      selectedOptionValues: { ...previousForm.selectedOptionValues, [optionTypeId]: valueId },
    }));
  };

  const handleSave = () => {
    const optionValueIds = Object.values(form.selectedOptionValues).filter(Boolean);
    onSave({
      SKU: form.SKU.trim() || null,
      priceCents: form.priceCents,
      quantity: Number(form.quantity),
      isActive: initial.isActive ?? true,
      optionValueIds,
      imageFile: form.imageFile,
      imageUrl: form.imageRemoved ? null : form.imageUrl,
    });
  };

  const allOptionsSelected =
    options.length === 0 || options.every((optionType) => form.selectedOptionValues[optionType.id]);

  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-3">
      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((optionType) => (
            <Select
              key={optionType.id}
              size="sm"
              label={optionType.name}
              placeholder={productsTranslations("selectOptionValuePlaceholder")}
              selectedKeys={form.selectedOptionValues[optionType.id] ? [form.selectedOptionValues[optionType.id]] : []}
              onSelectionChange={(selectedKeys) => handleOptionValueChange(optionType.id, [...selectedKeys][0])}
            >
              {optionType.values.map((optionValue) => (
                <SelectItem key={optionValue.id}>{optionValue.value}</SelectItem>
              ))}
            </Select>
          ))}
        </div>
      )}

      {options.length === 0 && (
        <p className="text-xs text-amber-600">{productsTranslations("noOptionTypesWarning")}</p>
      )}

      <Input
        size="sm"
        label={productsTranslations("variantSku")}
        placeholder={productsTranslations("variantSkuPlaceholder")}
        value={form.SKU}
        onChange={(skuChangeEvent) => updateForm({ SKU: skuChangeEvent.target.value })}
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          size="sm"
          label={productsTranslations("variantPrice")}
          placeholder={productsTranslations("variantPricePlaceholder")}
          value={form.priceCents / 100}
          minValue={0}
          step={0.01}
          startContent={
            <span className="text-default-400 text-small">{currency?.acronym ?? "$"}</span>
          }
          onValueChange={(priceValue) => updateForm({ priceCents: Math.round((priceValue ?? 0) * 100) })}
        />
        <NumberInput
          size="sm"
          label={productsTranslations("variantStock")}
          placeholder={productsTranslations("variantStockPlaceholder")}
          value={form.quantity}
          minValue={0}
          step={1}
          onValueChange={(quantityValue) => updateForm({ quantity: quantityValue ?? 0 })}
        />
      </div>

      <ImageUploader
        isCompact
        image={form.imageFile ?? form.imageUrl}
        onChange={handleImageChange}
        uploadText={productsTranslations("modal.productImageUpload")}
        uploadDescription={productsTranslations("modal.productImageUploadMessage")}
      />

      <div className="flex gap-2 justify-end pt-1">
        <Button size="sm" variant="bordered" onPress={onCancel} isDisabled={isLoading}>
          {productsTranslations("cancelVariant")}
        </Button>
        <Button
          size="sm"
          color="primary"
          className="bg-green-800"
          onPress={handleSave}
          isLoading={isLoading}
          isDisabled={!allOptionsSelected}
        >
          {productsTranslations("saveVariant")}
        </Button>
      </div>
    </div>
  );
}
