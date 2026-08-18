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
} from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

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
  businessType = null,
}) {
  const roleTranslations = useTranslations();
  const [advanced, setAdvanced] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const templates = roleTemplates[businessType] ?? [];

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template.key);
    setForm((previousForm) => ({
      ...previousForm,
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
      placement="center"
      backdrop="blur"
      shouldBlockScroll={false}
      classNames={{
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          {advanced && (
            <Button isIconOnly variant="light" size="sm" onPress={handleBack} aria-label="Go back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          {roleTranslations("roles.create.title")}
        </ModalHeader>

        <ModalBody className="max-h-[70vh] overflow-y-auto space-y-4">
          {!advanced ? (
            <>
              <p className="text-sm text-default-500">
                {roleTranslations("roles.create.templateLegend")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === template.key;
                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${isSelected
                        ? "border-primary"
                        : "border-default-200 hover:border-primary-300"
                        }`}
                    >
                      <div className="rounded-lg p-2 bg-default-100">
                        <Icon className="w-5 h-5 text-default-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {roleTranslations(`roles.templates.${template.key}.name`)}
                        </p>
                        <p className="text-xs text-default-400">
                          {roleTranslations(`roles.templates.${template.key}.description`)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4">
                <Input
                  label={roleTranslations("roles.create.roleName")}
                  placeholder={roleTranslations("roles.create.roleNamePlaceholder")}
                  value={resolveRoleName(form.name, roleTranslations)}
                  onChange={(event) => setForm((previousForm) => ({ ...previousForm, name: event.target.value }))}
                  isRequired
                />
              </div>

              <Checkbox
                isSelected={form.isAdmin}
                onValueChange={(isSelected) => setForm((previousForm) => ({ ...previousForm, isAdmin: isSelected }))}
              >
                {roleTranslations("roles.create.isAdmin")}
              </Checkbox>

              <div className="space-y-4">
                <p className="text-sm text-default-600">
                  {roleTranslations("roles.permissions.legend")}
                </p>
                <PermissionSelector
                  catalog={permissionOptions}
                  selected={form.permissions}
                  togglePermission={togglePermission}
                  businessType={businessType}
                  isAdmin={form.isAdmin}
                />
              </div>
            </>
          )}
        </ModalBody>

        <ModalFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <div>
            {!advanced && (
              <Button
                variant="flat"
                onPress={handleAdvanced}
              >
                {roleTranslations("roles.create.advanced")}
              </Button>
            )}
          </div>
          <div className="flex justify-between sm:justify-end gap-2">
            <Button
              variant="bordered"
              className="border border-border text-foreground hover:bg-muted transition-colors"
              onPress={handleClose}
            >
              {roleTranslations("roles.actions.cancel")}
            </Button>
            <Button
              color="primary"
              className="bg-green-800"
              onPress={onSubmit}
              isDisabled={!form.name.trim() || creating}
              isLoading={creating}
            >
              {roleTranslations("roles.actions.create")}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
