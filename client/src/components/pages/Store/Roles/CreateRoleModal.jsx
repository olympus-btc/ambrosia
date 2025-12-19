"use client";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Checkbox,
  Spinner,
} from "@heroui/react";
import { PermissionSelector } from "./PermissionSelector";

export function CreateRoleModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  permissionOptions = [],
  togglePermission,
  creating = false,
  t,
  businessType = null,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="3xl"
      backdrop="blur"
      scrollBehavior="inside"
    >
      <ModalContent className="max-h-[85vh]">
        <ModalHeader>{t("roles.create.title")}</ModalHeader>
        <ModalBody className="max-h-[70vh] overflow-y-auto space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label={t("roles.create.roleName")}
              placeholder="Ej. Cajero"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              isRequired
            />
            <Input
              label={t("roles.create.password")}
              placeholder={t("roles.create.passwordPlaceholder")}
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
            />
            <Checkbox
              isSelected={form.isAdmin}
              onValueChange={(v) => setForm((prev) => ({ ...prev, isAdmin: v }))}
            >
              {t("roles.create.isAdmin")}
            </Checkbox>
          </div>

          <div className="mt-4 space-y-4">
            <p className="text-sm text-default-600">
              {t("roles.permissions.legend")}
            </p>
            <PermissionSelector
              catalog={permissionOptions}
              selected={form.permissions}
              togglePermission={togglePermission}
              t={t}
              businessType={businessType}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>
            {t("roles.actions.cancel")}
          </Button>
          <Button
            color="primary"
            className="bg-green-800"
            onPress={onSubmit}
            isDisabled={!form.name.trim()}
          >
            {creating ? <Spinner color="white" size="sm" /> : t("roles.actions.create")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
