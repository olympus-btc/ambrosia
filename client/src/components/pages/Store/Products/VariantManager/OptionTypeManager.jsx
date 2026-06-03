"use client";
import { useState } from "react";

import { Button, Card, CardBody, Chip, Input } from "@heroui/react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

function OptionValueInput({ values, onChange }) {
  const productsTranslations = useTranslations("products");
  const [draft, setDraft] = useState("");

  const addValue = () => {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  const removeValue = (valueToRemove) => {
    onChange(values.filter((v) => v !== valueToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addValue();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          size="sm"
          placeholder={productsTranslations("optionValuePlaceholder")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          size="sm"
          variant="flat"
          onPress={addValue}
          isDisabled={!draft.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Chip
              key={value}
              size="sm"
              className="bg-gray-100 text-gray-700"
              endContent={
                <button
                  type="button"
                  onClick={() => removeValue(value)}
                  className="ml-0.5 text-gray-400 hover:text-gray-600"
                  aria-label={productsTranslations("removeOptionValue")}
                >
                  <X className="w-3 h-3" />
                </button>
              }
            >
              {value}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionTypeForm({ initial, onSave, onCancel, isSaving }) {
  const productsTranslations = useTranslations("products");
  const [name, setName] = useState(initial?.name ?? "");
  const [values, setValues] = useState(initial?.values?.map((v) => v.value) ?? []);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), values: values.map((v, i) => ({ value: v, displayOrder: i })) });
  };

  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-3">
      <Input
        size="sm"
        label={productsTranslations("optionTypeName")}
        placeholder={productsTranslations("optionTypeNamePlaceholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <OptionValueInput values={values} onChange={setValues} />
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
          isDisabled={!name.trim() || values.length === 0}
        >
          {productsTranslations("saveVariant")}
        </Button>
      </div>
    </div>
  );
}

export function OptionTypeManager({
  productId,
  options = [],
  onAddOptionType,
  onUpdateOptionType,
  onDeleteOptionType,
  onRefresh,
}) {
  const productsTranslations = useTranslations("products");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async (data) => {
    setIsSaving(true);
    try {
      const newId = await onAddOptionType(productId, data);
      if (newId) {
        await onRefresh?.();
        setIsAddingNew(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (optionTypeId, data) => {
    setIsSaving(true);
    try {
      const wasUpdated = await onUpdateOptionType(productId, optionTypeId, data);
      if (wasUpdated) {
        await onRefresh?.();
        setEditingId(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (optionTypeId) => {
    setIsSaving(true);
    try {
      await onDeleteOptionType(productId, optionTypeId);
      await onRefresh?.();
    } finally {
      setIsSaving(false);
    }
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

      {options.length === 0 && !isAddingNew && (
        <p className="text-sm text-gray-400 py-1">{productsTranslations("noOptionTypes")}</p>
      )}

      <div className="space-y-2">
        {options.map((optionType) =>
          editingId === optionType.id ? (
            <OptionTypeForm
              key={optionType.id}
              initial={optionType}
              onSave={(data) => handleUpdate(optionType.id, data)}
              onCancel={() => setEditingId(null)}
              isSaving={isSaving}
            />
          ) : (
            <Card key={optionType.id} shadow="none" className="border border-gray-200 bg-white">
              <CardBody className="p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{optionType.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {optionType.values.map((val) => (
                        <Chip key={val.id} size="sm" className="bg-gray-100 text-gray-700 border border-gray-200">
                          {val.value}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingId(optionType.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
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
          )
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
