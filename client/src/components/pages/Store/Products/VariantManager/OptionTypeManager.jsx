"use client";
import { useState } from "react";

import { addToast, Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { OptionTypeCard } from "./OptionTypeCard";
import { OptionTypeForm } from "./OptionTypeForm";

export function OptionTypeManager({
  productId,
  optionTypes = [],
  optionTypeActions,
  onRefresh,
}) {
  const productsTranslations = useTranslations("products");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingOptionTypeId, setEditingOptionTypeId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const executeOptionTypeMutation = async (optionTypeMutation) => {
    setIsSaving(true);
    try {
      const mutationResult = await optionTypeMutation();
      if (mutationResult !== false && mutationResult !== null) await onRefresh?.();
      return mutationResult;
    } finally {
      setIsSaving(false);
    }
  };

  const notifyOptionTypeSuccess = (toastDescriptionKey) => {
    addToast({
      description: productsTranslations(toastDescriptionKey),
      color: "success",
    });
  };

  const handleAdd = async (optionTypeRequest) => {
    const createdOptionTypeId = await executeOptionTypeMutation(async () => {
      const createdOptionTypeId = await optionTypeActions.add(productId, optionTypeRequest);
      if (createdOptionTypeId) {
        setIsAddingNew(false);
        notifyOptionTypeSuccess("toasts.optionTypeCreateSuccess");
      }
      return createdOptionTypeId;
    });
    return createdOptionTypeId;
  };

  const handleUpdate = async (optionTypeId, optionTypeRequest) => {
    const optionTypeWasUpdated = await executeOptionTypeMutation(async () => {
      const optionTypeWasUpdated = await optionTypeActions.update(productId, optionTypeId, optionTypeRequest);
      if (optionTypeWasUpdated) {
        setEditingOptionTypeId(null);
        notifyOptionTypeSuccess("toasts.optionTypeUpdateSuccess");
      }
      return optionTypeWasUpdated;
    });
    return optionTypeWasUpdated;
  };

  const handleDelete = async (optionTypeId) => {
    await executeOptionTypeMutation(async () => {
      const optionTypeWasDeleted = await optionTypeActions.delete(productId, optionTypeId);
      if (optionTypeWasDeleted) notifyOptionTypeSuccess("toasts.optionTypeDeleteSuccess");
      return optionTypeWasDeleted;
    });
  };

  const renderOptionType = (optionType) => {
    if (editingOptionTypeId === optionType.id) {
      return (
        <OptionTypeForm
          key={optionType.id}
          initial={optionType}
          onSave={(optionTypeRequest) => handleUpdate(optionType.id, optionTypeRequest)}
          onCancel={() => setEditingOptionTypeId(null)}
          isSaving={isSaving}
        />
      );
    }

    return (
      <OptionTypeCard
        key={optionType.id}
        optionType={optionType}
        isSaving={isSaving}
        onEdit={setEditingOptionTypeId}
        onDelete={handleDelete}
      />
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-700">{productsTranslations("optionTypes")}</span>
        {!isAddingNew && (
          <Button
            size="sm"
            variant="flat"
            startContent={<Plus className="w-3.5 h-3.5" />}
            onPress={() => setIsAddingNew(true)}
          >
            {productsTranslations("addOptionType")}
          </Button>
        )}
      </div>

      {optionTypes.length === 0 && !isAddingNew && (
        <p className="text-sm text-gray-400 py-1">{productsTranslations("noOptionTypes")}</p>
      )}

      <div className="space-y-2">
        {optionTypes.map(renderOptionType)}

        {isAddingNew && (
          <OptionTypeForm
            onSave={handleAdd}
            onCancel={() => setIsAddingNew(false)}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}
