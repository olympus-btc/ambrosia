"use client";

import { Button, ModalFooter } from "@heroui/react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@components/shared/DeleteButton";

export function TimeEntryModalFooter({
  isReadOnly,
  isEditing,
  canEdit,
  canDelete,
  isFormComplete,
  isSubmitting,
  onStartEditing,
  onDelete,
  onCancel,
  onClose,
}) {
  const timesheetTranslations = useTranslations("timesheet");

  if (isReadOnly) {
    return (
      <ModalFooter className="flex items-center justify-end gap-2 p-0 my-4">
        <Button
          variant="bordered"
          type="button"
          className="px-6 py-2 border border-border text-foreground hover:bg-muted transition-colors"
          onPress={onClose}
        >
          {timesheetTranslations("modal.closeButton")}
        </Button>
        {canEdit && (
          <Button color="primary" className="bg-green-800" type="button" onPress={onStartEditing}>
            {timesheetTranslations("modal.editButton")}
          </Button>
        )}
      </ModalFooter>
    );
  }

  return (
    <ModalFooter className="flex justify-between p-0 my-4">
      <div className="flex items-center gap-2">
        {isEditing && canDelete && (
          <DeleteButton size="md" showLabelOnMobile onPress={onDelete}>
            {timesheetTranslations("modal.deleteButton")}
          </DeleteButton>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="bordered"
          type="button"
          className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onPress={onCancel}
        >
          {timesheetTranslations("modal.cancelButton")}
        </Button>
        <Button
          color="primary"
          className="bg-green-800"
          type="submit"
          isDisabled={!isFormComplete}
          isLoading={isSubmitting}
        >
          {timesheetTranslations("modal.saveButton")}
        </Button>
      </div>
    </ModalFooter>
  );
}
