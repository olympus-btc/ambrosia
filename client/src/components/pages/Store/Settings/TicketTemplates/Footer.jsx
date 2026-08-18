"use client";

import { useState } from "react";

import { Button, ModalFooter } from "@heroui/react";

import { RequirePermission } from "@/hooks/usePermission";

export function TicketTemplatesFooter({
  selectedId,
  deleting,
  onDelete,
  onClose,
  onSave,
  saving,
  name,
  settingsTranslations,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <ModalFooter className="flex justify-between">
      <div className="flex items-center gap-2">
        {selectedId && (
          <RequirePermission allOf={["printer_update"]}>
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
            isDisabled={saving || !name.trim()}
          >
            {selectedId ? settingsTranslations("templates.saveChanges") : settingsTranslations("templates.saveNew")}
          </Button>
        </RequirePermission>
      </div>
    </ModalFooter>
  );
}
