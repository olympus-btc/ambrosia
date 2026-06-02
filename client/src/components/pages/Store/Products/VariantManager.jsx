"use client";
import { useRef, useState } from "react";

import { Button, Card, CardBody, Image, Input, NumberInput } from "@heroui/react";
import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { useUpload } from "@/components/hooks/useUpload";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";

function VariantImagePicker({ imageUrl, onFileChange }) {
  const t = useTranslations("products");
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const currentImage = preview ?? storedAssetUrl(imageUrl);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    onFileChange(file);
    e.target.value = "";
  };

  const handleRemove = () => {
    setPreview(null);
    onFileChange(null);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
      >
        {currentImage ? (
          <Image
            src={currentImage}
            alt="variant"
            removeWrapper
            className="w-full h-full object-cover rounded-none"
          />
        ) : (
          <ImageIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs text-blue-600 hover:text-blue-700 underline text-left leading-none"
        >
          {t("variantChangeImage")}
        </button>
        {currentImage && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-red-500 hover:text-red-600 text-left leading-none"
          >
            {t("variantRemoveImage")}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

function VariantForm({ initial = {}, currency, onSave, onCancel, isLoading }) {
  const t = useTranslations("products");
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
        label={t("variantSku")}
        placeholder={t("variantSkuPlaceholder")}
        value={form.SKU}
        onChange={(e) => setForm((p) => ({ ...p, SKU: e.target.value }))}
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          size="sm"
          label={t("variantPrice")}
          placeholder={t("variantPricePlaceholder")}
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
          label={t("variantStock")}
          placeholder={t("variantStockPlaceholder")}
          value={form.quantity}
          minValue={0}
          step={1}
          onValueChange={(v) => setForm((p) => ({ ...p, quantity: v ?? 0 }))}
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button size="sm" variant="bordered" onPress={onCancel} isDisabled={isLoading}>
          {t("cancelVariant")}
        </Button>
        <Button
          size="sm"
          color="primary"
          className="bg-green-800"
          onPress={handleSave}
          isLoading={isLoading}
        >
          {t("saveVariant")}
        </Button>
      </div>
    </div>
  );
}

function VariantCard({ variant, currency, onSave, onDelete, isProcessing }) {
  const t = useTranslations("products");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleSave = async (data) => {
    await onSave(variant.id, data);
    setEditing(false);
  };

  const imageUrl = storedAssetUrl(variant.imageUrl);
  const price = `${currency?.acronym ?? "$"}${(variant.priceCents / 100).toFixed(2)}`;

  if (editing) {
    return (
      <VariantForm
        initial={variant}
        currency={currency}
        onSave={handleSave}
        onCancel={() => setEditing(false)}
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
              {variant.SKU ?? "—"}
            </p>
            <p className="text-xs text-gray-500">
              {price} · {variant.quantity} {t("variantStockUnit")}
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {confirming ? (
              <>
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  onPress={() => onDelete(variant.id)}
                  isLoading={isProcessing}
                >
                  {t("deleteVariantConfirm")}
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
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

export function VariantManager({
  productId,
  variants = [],
  onAddVariant,
  onUpdateVariant,
  onDeleteVariant,
  onRefresh,
}) {
  const t = useTranslations("products");
  const { currency } = useCurrency();
  const { upload, isUploading } = useUpload();
  const [addingNew, setAddingNew] = useState(false);
  const [processing, setProcessing] = useState(false);

  const resolveImageUrl = async (imageFile, fallbackUrl) => {
    if (imageFile instanceof File) {
      const uploads = await upload([imageFile]);
      return uploads?.[0]?.url ?? uploads?.[0]?.path ?? null;
    }
    return fallbackUrl ?? null;
  };

  const handleAdd = async (data) => {
    setProcessing(true);
    try {
      const imageUrl = await resolveImageUrl(data.imageFile, data.imageUrl);
      await onAddVariant(productId, {
        SKU: data.SKU,
        priceCents: data.priceCents,
        quantity: data.quantity,
        isActive: data.isActive,
        optionValueIds: data.optionValueIds,
        imageUrl,
      });
      await onRefresh?.();
      setAddingNew(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async (variantId, data) => {
    setProcessing(true);
    try {
      const imageUrl = await resolveImageUrl(data.imageFile, data.imageUrl);
      await onUpdateVariant(productId, variantId, {
        SKU: data.SKU,
        priceCents: data.priceCents,
        quantity: data.quantity,
        isActive: data.isActive,
        optionValueIds: data.optionValueIds,
        imageUrl,
      });
      await onRefresh?.();
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (variantId) => {
    setProcessing(true);
    try {
      await onDeleteVariant(productId, variantId);
      await onRefresh?.();
    } finally {
      setProcessing(false);
    }
  };

  const isLoading = processing || isUploading;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-700">{t("variants")}</span>
        {!addingNew && (
          <Button
            size="sm"
            variant="flat"
            startContent={<Plus className="w-3.5 h-3.5" />}
            onPress={() => setAddingNew(true)}
          >
            {t("addVariant")}
          </Button>
        )}
      </div>

      {variants.length === 0 && !addingNew && (
        <p className="text-sm text-gray-400 py-1">{t("noVariants")}</p>
      )}

      <div className="space-y-2">
        {variants.map((v) => (
          <VariantCard
            key={v.id}
            variant={v}
            currency={currency}
            onSave={handleSave}
            onDelete={handleDelete}
            isProcessing={isLoading}
          />
        ))}

        {addingNew && (
          <VariantForm
            initial={{}}
            currency={currency}
            onSave={handleAdd}
            onCancel={() => setAddingNew(false)}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
