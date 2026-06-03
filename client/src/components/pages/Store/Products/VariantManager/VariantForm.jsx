"use client";
import { useState } from "react";

import { Button, Input, NumberInput, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

import { VariantImagePicker } from "./VariantImagePicker";

export function VariantForm({ initial = {}, currency, options = [], onSave, onCancel, isLoading }) {
  const productsTranslations = useTranslations("products");

  const buildInitialOptionValues = () => {
    const map = {};
    options.forEach((type) => {
      const matchedValue = type.values.find((v) => initial.optionValueIds?.includes(v.id));
      if (matchedValue) map[type.id] = matchedValue.id;
    });
    return map;
  };

  const [form, setForm] = useState({
    SKU: initial.SKU ?? "",
    priceCents: initial.priceCents ?? 0,
    quantity: initial.quantity ?? 0,
    imageFile: null,
    imageUrl: initial.imageUrl ?? null,
    imageRemoved: false,
    selectedOptionValues: buildInitialOptionValues(),
  });

  const handleImageChange = (file) => {
    if (file === null) {
      setForm((p) => ({ ...p, imageFile: null, imageUrl: null, imageRemoved: true }));
    } else {
      setForm((p) => ({ ...p, imageFile: file, imageRemoved: false }));
    }
  };

  const handleOptionValueChange = (optionTypeId, valueId) => {
    setForm((p) => ({
      ...p,
      selectedOptionValues: { ...p.selectedOptionValues, [optionTypeId]: valueId },
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

  const allOptionsSelected = options.length === 0 || options.every((type) => form.selectedOptionValues[type.id]);

  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-3">
      <VariantImagePicker
        imageUrl={form.imageUrl}
        onFileChange={handleImageChange}
      />

      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((optionType) => (
            <Select
              key={optionType.id}
              size="sm"
              label={optionType.name}
              placeholder={productsTranslations("selectOptionValuePlaceholder")}
              selectedKeys={form.selectedOptionValues[optionType.id] ? [form.selectedOptionValues[optionType.id]] : []}
              onSelectionChange={(keys) => handleOptionValueChange(optionType.id, [...keys][0])}
            >
              {optionType.values.map((val) => (
                <SelectItem key={val.id}>{val.value}</SelectItem>
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
        onChange={(e) => setForm((p) => ({ ...p, SKU: e.target.value }))}
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
          onValueChange={(v) => setForm((p) => ({ ...p, priceCents: Math.round((v ?? 0) * 100) }))}
        />
        <NumberInput
          size="sm"
          label={productsTranslations("variantStock")}
          placeholder={productsTranslations("variantStockPlaceholder")}
          value={form.quantity}
          minValue={0}
          step={1}
          onValueChange={(v) => setForm((p) => ({ ...p, quantity: v ?? 0 }))}
        />
      </div>

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
