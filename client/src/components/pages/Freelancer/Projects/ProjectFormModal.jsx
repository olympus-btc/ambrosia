"use client";

import { useRef, useState } from "react";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  NumberInput,
  Select,
  SelectItem,
  Switch,
} from "@heroui/react";
import { useTranslations } from "next-intl";

const PROJECT_STATUSES = ["pending", "in_progress", "done", "paid", "cancelled"];

export function ProjectFormModal({
  clients,
  isOpen,
  mode,
  onChange,
  onClose,
  onSubmit,
  projectForm,
}) {
  const projectTranslations = useTranslations("freelanceProjects");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const isEditMode = mode === "edit";

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    try {
      setIsSubmitting(true);
      await onSubmit(projectForm);
      onClose();
    } catch {
      return;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(nextOpenState) => {
        if (!nextOpenState) onClose();
      }}
      placement="center"
      backdrop="blur"
      shouldBlockScroll={false}
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
      }}
    >
      <ModalContent>
        <ModalHeader>
          {isEditMode ? projectTranslations("modal.titleEdit") : projectTranslations("modal.titleAdd")}
        </ModalHeader>
        <ModalBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Select
              label={projectTranslations("modal.clientLabel")}
              selectedKeys={projectForm.clientId ? [projectForm.clientId] : []}
              isRequired
              isDisabled={isEditMode}
              onSelectionChange={(selectedClientKeys) => {
                const selectedClientId = Array.from(selectedClientKeys)[0] || "";
                onChange({ clientId: selectedClientId });
              }}
            >
              {clients.map((client) => (
                <SelectItem key={client.id}>{client.name}</SelectItem>
              ))}
            </Select>

            <Input
              label={projectTranslations("modal.nameLabel")}
              placeholder={projectTranslations("modal.namePlaceholder")}
              value={projectForm.name}
              isRequired
              errorMessage={projectTranslations("modal.nameError")}
              onChange={(nameChangeEvent) => onChange({ name: nameChangeEvent.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label={projectTranslations("modal.statusLabel")}
                selectedKeys={projectForm.status ? [projectForm.status] : []}
                isRequired
                onSelectionChange={(selectedStatusKeys) => {
                  const selectedStatus = Array.from(selectedStatusKeys)[0] || "";
                  onChange({ status: selectedStatus });
                }}
              >
                {PROJECT_STATUSES.map((projectStatus) => (
                  <SelectItem key={projectStatus}>
                    {projectTranslations(`statuses.${projectStatus}`)}
                  </SelectItem>
                ))}
              </Select>

              <NumberInput
                label={projectTranslations("modal.hourlyRateOverrideLabel")}
                description={projectTranslations("modal.hourlyRateOverrideHint")}
                minValue={0}
                step={0.01}
                value={projectForm.hourlyRateCents === null ? undefined : projectForm.hourlyRateCents / 100}
                onValueChange={(hourlyRateValue) => {
                  const hourlyRateCents =
                    typeof hourlyRateValue === "number" ? Math.round(hourlyRateValue * 100) : null;
                  onChange({ hourlyRateCents });
                }}
              />
            </div>

            <Switch
              isSelected={projectForm.isBillable}
              onValueChange={(isBillable) => onChange({ isBillable })}
            >
              {projectTranslations("modal.isBillableLabel")}
            </Switch>

            <ModalFooter className="flex justify-between p-0 my-4">
              <Button
                variant="bordered"
                type="button"
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onPress={onClose}
                isDisabled={isSubmitting}
              >
                {projectTranslations("modal.cancelButton")}
              </Button>
              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
                isDisabled={isSubmitting}
                isLoading={isSubmitting}
              >
                {isEditMode ? projectTranslations("modal.editButton") : projectTranslations("modal.submitButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
