"use client";
import { useState } from "react";

import { Button, Card, CardBody, Chip, Input } from "@heroui/react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

function OptionValueInput({ optionValueNames, onOptionValueNamesChange }) {
  const productsTranslations = useTranslations("products");
  const [pendingOptionValueName, setPendingOptionValueName] = useState("");

  const addValue = () => {
    const trimmedOptionValueName = pendingOptionValueName.trim();
    if (!trimmedOptionValueName || optionValueNames.includes(trimmedOptionValueName)) return;
    onOptionValueNamesChange([...optionValueNames, trimmedOptionValueName]);
    setPendingOptionValueName("");
  };

  const removeValue = (valueToRemove) => {
    onOptionValueNamesChange(
      optionValueNames.filter((existingOptionValueName) => existingOptionValueName !== valueToRemove),
    );
  };

  const handleKeyDown = (keyboardEvent) => {
    if (keyboardEvent.key === "Enter") {
      keyboardEvent.preventDefault();
      addValue();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          size="sm"
          placeholder={productsTranslations("optionValuePlaceholder")}
          value={pendingOptionValueName}
          onChange={(optionValueChangeEvent) => setPendingOptionValueName(optionValueChangeEvent.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          size="sm"
          variant="flat"
          onPress={addValue}
          isDisabled={!pendingOptionValueName.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {optionValueNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {optionValueNames.map((optionValueName) => (
            <Chip
              key={optionValueName}
              size="sm"
              className="bg-gray-100 text-gray-700"
              endContent={(
                <button
                  type="button"
                  onClick={() => removeValue(optionValueName)}
                  className="ml-0.5 text-gray-400 hover:text-gray-600"
                  aria-label={productsTranslations("removeOptionValue")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            >
              {optionValueName}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionTypeForm({ initial, onSave, onCancel, isSaving }) {
  const productsTranslations = useTranslations("products");
  const [optionTypeName, setOptionTypeName] = useState(initial?.name ?? "");
  const [optionValueNames, setOptionValueNames] =
    useState(initial?.values?.map((initialOptionValue) => initialOptionValue.value) ?? []);

  const handleSave = () => {
    if (!optionTypeName.trim()) return;
    onSave({
      name: optionTypeName.trim(),
      values: optionValueNames.map((optionValueName, displayOrder) => ({ value: optionValueName, displayOrder })),
    });
  };

  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-3">
      <Input
        size="sm"
        label={productsTranslations("optionTypeName")}
        placeholder={productsTranslations("optionTypeNamePlaceholder")}
        value={optionTypeName}
        onChange={(optionTypeNameChangeEvent) => setOptionTypeName(optionTypeNameChangeEvent.target.value)}
      />
      <OptionValueInput optionValueNames={optionValueNames} onOptionValueNamesChange={setOptionValueNames} />
      <div className="flex gap-2 justify-end pt-1">
        <Button size="sm" variant="bordered" onPress={onCancel} isDisabled={isSaving}>
          {productsTranslations("cancelVariant")}
        </Button>
        <Button
          size="sm"
          color="primary"
          className="bg-green-800"
          onPress={handleSave}
          isLoading={isSaving}
          isDisabled={!optionTypeName.trim() || optionValueNames.length === 0}
        >
          {productsTranslations("saveVariant")}
        </Button>
      </div>
    </div>
  );
}

export function OptionTypeManager({
  productId,
  options: optionTypes = [],
  onAddOptionType,
  onUpdateOptionType,
  onDeleteOptionType,
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

  const handleAdd = async (optionTypeRequest) => {
    const createdOptionTypeId = await executeOptionTypeMutation(async () => {
      const createdOptionTypeId = await onAddOptionType(productId, optionTypeRequest);
      if (createdOptionTypeId) setIsAddingNew(false);
      return createdOptionTypeId;
    });
    return createdOptionTypeId;
  };

  const handleUpdate = async (optionTypeId, optionTypeRequest) => {
    const optionTypeWasUpdated = await executeOptionTypeMutation(async () => {
      const optionTypeWasUpdated = await onUpdateOptionType(productId, optionTypeId, optionTypeRequest);
      if (optionTypeWasUpdated) setEditingOptionTypeId(null);
      return optionTypeWasUpdated;
    });
    return optionTypeWasUpdated;
  };

  const handleDelete = async (optionTypeId) => {
    await executeOptionTypeMutation(() => onDeleteOptionType(productId, optionTypeId));
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
        {optionTypes.map((optionType) => (editingOptionTypeId === optionType.id ? (
          <OptionTypeForm
            key={optionType.id}
            initial={optionType}
            onSave={(optionTypeRequest) => handleUpdate(optionType.id, optionTypeRequest)}
            onCancel={() => setEditingOptionTypeId(null)}
            isSaving={isSaving}
          />
        ) : (
          <Card key={optionType.id} shadow="none" className="border border-gray-200 bg-white">
            <CardBody className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{optionType.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {optionType.values.map((optionValue) => (
                      <Chip
                        key={optionValue.id}
                        size="sm"
                        className="bg-gray-100 text-gray-700 border border-gray-200"
                      >
                        {optionValue.value}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    data-testid={`edit-option-type-${optionType.id}`}
                    aria-label={`${productsTranslations("edit")} ${optionType.name}`}
                    onClick={() => setEditingOptionTypeId(optionType.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-option-type-${optionType.id}`}
                    aria-label={`${productsTranslations("delete")} ${optionType.name}`}
                    onClick={() => handleDelete(optionType.id)}
                    disabled={isSaving}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>
        )),
        )}

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
