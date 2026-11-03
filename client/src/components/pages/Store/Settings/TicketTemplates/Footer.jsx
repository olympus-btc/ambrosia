"use client";

import { useState } from "react";

import { Button, ModalFooter } from "@heroui/react";

import { RequirePermission } from "@/hooks/usePermission";

export function TicketTemplatesFooter({
  selectedId,
  isDefault,
  settingDefault,
  onSetDefault,
  deleting,
  onDelete,
  onClose,
  onSave,
  saving,
  templateName,
  settingsTranslations,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <ModalFooter className="flex justify-between">
      <div className="flex items-center gap-2">
        {selectedId && isDefault && (
          <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700">
            {settingsTranslations("templates.defaultBadge")}
          </span>
        )}
        {selectedId && !isDefault && (
          <RequirePermission allOf={["printer_update"]}>
            <Button variant="bordered" className="border border-green-800 text-green-800" onPress={onSetDefault} isLoading={settingDefault}>
              {settingsTranslations("templates.setDefault")}
            </Button>
            {confirmDelete ? (
              <>
                <Button size="sm" color="danger" onPress={onDelete} isDisabled={deleting}>
                  {settingsTranslations("templates.confirmDelete")}
                </Button>
                <Button size="sm" variant="light" onPress={() => setConfirmDelete(false)}>
                  {settingsTranslations("templates.cancelDelete")}
                </Button>
              </>
            ) : (
              <Button color="danger" variant="bordered" onPress={() => setConfirmDelete(true)}>
                {settingsTranslations("templates.deleteTemplate")}
              </Button>
            )}
          </RequirePermission>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="bordered"
          className="border border-border text-foreground hover:bg-muted transition-colors"
          onPress={onClose}
        >
          {settingsTranslations("templates.close")}
        </Button>
        <RequirePermission allOf={["printer_update"]}>
          <Button
            color="primary"
            className="bg-green-800"
            onPress={onSave}
            isDisabled={saving || !templateName.trim()}
          >
            {selectedId ? settingsTranslations("templates.saveChanges") : settingsTranslations("templates.saveNew")}
          </Button>
        </RequirePermission>
      </div>
    </ModalFooter>
  );
}
