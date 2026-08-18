"use client";

import { useRef, useState } from "react";

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
  categoryForm,
  setCategoryForm,
  onChange,
  updateCategory,
  editCategoriesShowModal,
  setEditCategoriesShowModal,
}) {
  const categoryTranslations = useTranslations("categories");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleOnCloseModal = () => {
    setCategoryForm({ categoryId: "", categoryName: "" });
    setEditCategoriesShowModal(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    try {
      setIsSubmitting(true);
      await updateCategory(categoryForm);
      setEditCategoriesShowModal(false);
    } catch {
      return;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={editCategoriesShowModal}
      onOpenChange={handleOnCloseModal}
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
        <ModalHeader>{categoryTranslations("modal.titleEdit")}</ModalHeader>
        <ModalBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label={categoryTranslations("modal.categoryNameLabel")}
              type="text"
              placeholder={categoryTranslations("modal.categoryNamePlaceholder")}
              isRequired
              errorMessage={categoryTranslations("modal.errorMsgInputFieldEmpty")}
              value={categoryForm.categoryName ?? ""}
              onChange={(event) => onChange({ categoryName: event.target.value })}
            />
            <ModalFooter className="flex justify-between p-0 my-4">
              <Button
                variant="bordered"
                type="button"
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onPress={() => handleOnCloseModal()}
              >
                {categoryTranslations("modal.cancelButton")}
              </Button>
              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
                isDisabled={isSubmitting}
                isLoading={isSubmitting}
              >
                {categoryTranslations("modal.editButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
