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

export function AddCategoriesModal({
  categoryForm,
  setCategoryForm,
  addCategory,
  onChange,
  addCategoriesShowModal,
  setAddCategoriesShowModal,
}) {
  const categoryTranslations = useTranslations("categories");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    try {
      setIsSubmitting(true);
      await addCategory(categoryForm);
      setCategoryForm({ categoryName: "" });
      setAddCategoriesShowModal(false);
    } catch {
      return;
    } finally {
      isSubmittingRef.current = false;
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
        <ModalHeader>{categoryTranslations("modal.titleAdd")}</ModalHeader>
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
                onPress={() => setAddCategoriesShowModal(false)}
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
                {categoryTranslations("modal.submitButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
