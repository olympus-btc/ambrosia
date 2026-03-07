"use client";

import { useState } from "react";

import { Button, ModalFooter } from "@heroui/react";

export function TicketTemplatesFooter({
  selectedId,
  deleting,
  onDelete,
  onClose,
  onSave,
  saving,
  name,
  t,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <ModalFooter className="flex justify-between">
      <div className="flex items-center gap-2">
        {selectedId && (
          confirmDelete ? (
            <>
              <Button size="sm" color="danger" onPress={onDelete} isDisabled={deleting}>
                {t("templates.confirmDelete")}
              </Button>
              <Button size="sm" variant="light" onPress={() => setConfirmDelete(false)}>
                {t("templates.cancelDelete")}
              </Button>
            </>
          ) : (
            <Button color="danger" variant="bordered" onPress={() => setConfirmDelete(true)}>
              {t("templates.deleteTemplate")}
            </Button>
          )
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="bordered" onPress={onClose}>
          {t("templates.close")}
        </Button>
        <Button color="primary" onPress={onSave} isDisabled={saving || !name.trim()}>
          {selectedId ? t("templates.saveChanges") : t("templates.saveNew")}
        </Button>
      </div>
    </ModalFooter>
  );
}
