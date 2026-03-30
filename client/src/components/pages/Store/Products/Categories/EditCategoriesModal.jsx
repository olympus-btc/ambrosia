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

export function EditCategoriesModal({
  data,
  setData,
  onChange,
  updateCategory,
  editCategoriesShowModal,
  setEditCategoriesShowModal,
}) {
  const t = useTranslations("categories");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOnCloseModal = () => {
    setData({ categoryId: "", categoryName: "" });
    setEditCategoriesShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await updateCategory(data);
      setEditCategoriesShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={editCategoriesShowModal}
      onOpenChange={handleOnCloseModal}
      placement="center"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
    >
      <ModalContent>
        <ModalHeader>{t("modal.titleEdit")}</ModalHeader>
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
                onPress={() => handleOnCloseModal()}
              >
                {t("modal.cancelButton")}
              </Button>
              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
                isLoading={isSubmitting}
              >
                {t("modal.editButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
