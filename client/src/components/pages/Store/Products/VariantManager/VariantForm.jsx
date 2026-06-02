"use client";
import { useState } from "react";

import { Button, Input, NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

import { VariantImagePicker } from "./VariantImagePicker";

export function VariantForm({ initial = {}, currency, onSave, onCancel, isLoading }) {
  const productsTranslations = useTranslations("products");
  const [form, setForm] = useState({
    SKU: initial.SKU ?? "",
    priceCents: initial.priceCents ?? 0,
    quantity: initial.quantity ?? 0,
    imageFile: null,
    imageUrl: initial.imageUrl ?? null,
    imageRemoved: false,
  });

  const handleImageChange = (file) => {
    if (file === null) {
      setForm((p) => ({ ...p, imageFile: null, imageUrl: null, imageRemoved: true }));
    } else {
      setForm((p) => ({ ...p, imageFile: file, imageRemoved: false }));
    }
  };

  const handleSave = () => {
    onSave({
      SKU: form.SKU.trim() || null,
      priceCents: form.priceCents,
      quantity: Number(form.quantity),
      isActive: initial.isActive ?? true,
      optionValueIds: initial.optionValueIds ?? [],
      imageFile: form.imageFile,
      imageUrl: form.imageRemoved ? null : form.imageUrl,
    });
  };

  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-3">
      <VariantImagePicker
        imageUrl={form.imageUrl}
        onFileChange={handleImageChange}
      />

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
        >
          {productsTranslations("saveVariant")}
        </Button>
      </div>
    </div>
  );
}
