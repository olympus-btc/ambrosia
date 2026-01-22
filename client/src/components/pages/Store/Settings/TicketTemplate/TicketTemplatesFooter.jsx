"use client";

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
  return (
    <ModalFooter className="flex justify-between">
      <div className="flex items-center gap-2">
        {selectedId && (
          <Button
            color="danger"
            variant="bordered"
            onPress={onDelete}
            isDisabled={deleting}
          >
            {t("templates.deleteTemplate")}
          </Button>
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
