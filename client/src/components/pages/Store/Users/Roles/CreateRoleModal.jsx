"use client";
import { useState } from "react";

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
import { SlidersHorizontal, ArrowLeft } from "lucide-react";

import { PermissionSelector } from "./PermissionSelector";
import { roleTemplates, resolveRoleName } from "./utils/roleTemplates";

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
  const [advanced, setAdvanced] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const templates = roleTemplates[businessType] ?? [];

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template.key);
    setForm((prev) => ({
      ...prev,
      name: template.key,
      isAdmin: template.isAdmin ?? false,
      permissions: template.permissions,
    }));
  };

  const handleClose = () => {
    setAdvanced(false);
    setSelectedTemplate(null);
    onClose();
  };

  const handleAdvanced = () => {
    setAdvanced(true);
  };

  const handleBack = () => {
    setAdvanced(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      size="3xl"
      backdrop="blur"
      scrollBehavior="inside"
    >
      <ModalContent className="max-h-[85vh]">
        <ModalHeader className="flex items-center gap-2">
          {advanced && (
            <Button isIconOnly variant="light" size="sm" onPress={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          {t("roles.create.title")}
        </ModalHeader>

        <ModalBody className="max-h-[70vh] overflow-y-auto space-y-4">
          {!advanced ? (
            <>
              <p className="text-sm text-default-500">
                {t("roles.create.templateLegend")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === template.key;
                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${isSelected
                        ? "border-green-700 bg-green-50"
                        : "border-default-200 hover:border-green-400 hover:bg-default-50"
                        }`}
                    >
                      <div className={`rounded-lg p-2 ${isSelected ? "bg-green-100" : "bg-default-100"}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? "text-green-700" : "text-default-600"}`} />
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${isSelected ? "text-green-800" : "text-foreground"}`}>
                          {t(`roles.templates.${template.key}.name`)}
                        </p>
                        <p className="text-xs text-default-400">
                          {t(`roles.templates.${template.key}.description`)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label={t("roles.create.roleName")}
                  placeholder="Ej. Cajero"
                  value={resolveRoleName(form.name, t)}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  isRequired
                />
                <Input
                  label={t("roles.create.password")}
                  placeholder={t("roles.create.passwordPlaceholder")}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
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
            </>
          )}
        </ModalBody>

        <ModalFooter className="flex justify-between">
          <div>
            {!advanced && (
              <Button
                variant="flat"
                startContent={<SlidersHorizontal className="w-4 h-4" />}
                onPress={handleAdvanced}
              >
                {t("roles.create.advanced")}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="bordered" onPress={handleClose}>
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
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
