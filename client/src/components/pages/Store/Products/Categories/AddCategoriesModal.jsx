"use client";

import { useState } from "react";

import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { useTranslations } from "next-intl";

export function AddCategoriesModal({
  data,
  setData,
  addCategory,
  onChange,
  addCategoriesShowModal,
  setAddCategoriesShowModal,
}) {
  const t = useTranslations("categories");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await addCategory(data);
      setData({ categoryName: "" });
      setAddCategoriesShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={addCategoriesShowModal}
      onOpenChange={setAddCategoriesShowModal}
      backdrop="blur"
      shouldBlockScroll={false}
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
      }}
      placement="center"
    >
      <ModalContent>
        <ModalHeader>{t("modal.titleAdd")}</ModalHeader>
        <ModalBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label={t("modal.categoryNameLabel")}
              type="text"
              placeholder={t("modal.categoryNamePlaceholder")}
              isRequired
              errorMessage={t("modal.errorMsgInputFieldEmpty")}
              value={data.categoryName ?? ""}
              onChange={(e) => onChange({ categoryName: e.target.value })}
            />
            <ModalFooter className="flex justify-between p-0 my-4">
              <Button
                variant="bordered"
                type="button"
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onPress={() => setAddCategoriesShowModal(false)}
              >
                {t("modal.cancelButton")}
              </Button>
              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
                isLoading={isSubmitting}
              >
                {t("modal.submitButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
