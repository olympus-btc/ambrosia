"use client";
import { useState } from "react";

import {
  Button,
  Input,
  NumberInput,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { ImageUploader } from "@components/shared/ImageUploader";

import { CategorySelector } from "./CategorySelector";

export function EditProductsModal({
  data,
  setData,
  onChange,
  updateProduct,
  onProductUpdated,
  isUploading = false,
  categories = [],
  categoriesLoading = false,
  createCategory,
  editProductsShowModal,
  setEditProductsShowModal,
}) {
  const t = useTranslations("products");
  const { currency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isUploading) return;

    try {
      setIsSubmitting(true);
      await updateProduct(data);
      setEditProductsShowModal(false);
      onProductUpdated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOnCloseModal = () => {
    setData({
      productId: "",
      productName: "",
      productDescription: "",
      productCategories: [],
      productSKU: "",
      productPrice: "",
      productStock: "",
      productMinStock: 0,
      productMaxStock: 0,
      productImage: null,
      productImageUrl: "",
      productImageRemoved: false,
    });

    setEditProductsShowModal(false);
  };

  return (
    <Modal
      className="[@media(max-height:800px)]:max-h-[600px] overflow-y-auto"
      isOpen={editProductsShowModal}
      onOpenChange={handleOnCloseModal}
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
      placement="center"
    >
      <ModalContent>
        <ModalHeader>{t("modal.titleEdit")}</ModalHeader>

        <ModalBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label={t("modal.productNameLabel")}
              placeholder={t("modal.productNamePlaceholder")}
              isRequired
              errorMessage={t("modal.errorMsgInputFieldEmpty")}
              value={data.productName}
              onChange={(e) => onChange({ productName: e.target.value })
              }
            />

            <Textarea
              label={t("modal.productDescriptionLabel")}
              placeholder={t("modal.productDescriptionPlaceholder")}
              isRequired
              errorMessage={t("modal.errorMsgInputFieldEmpty")}
              value={data.productDescription}
              onChange={(e) => onChange({ productDescription: e.target.value })
              }
            />

            <CategorySelector
              categories={categories}
              categoriesLoading={categoriesLoading}
              selectedCategories={data.productCategories}
              onSelectionChange={(keys) => onChange({ productCategories: keys })}
              createCategory={createCategory}
              isRequired
            />

            <Input
              label={t("modal.productSKULabel")}
              placeholder={t("modal.productSKUPlaceholder")}
              isRequired
              errorMessage={t("modal.errorMsgInputFieldEmpty")}
              value={data.productSKU}
              onChange={(e) => onChange({ productSKU: e.target.value })
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberInput
                label={t("modal.productPriceLabel")}
                placeholder={t("modal.productPricePlaceholder")}
                isRequired
                errorMessage={t("modal.errorMsgInputFieldEmpty")}
                startContent={
                  (
                    <span className="text-default-400 text-small">
                      {currency?.acronym || "$"}
                    </span>
                  )
                }
                minValue={0}
                value={data.productPrice}
                onValueChange={(value) => {
                  const numeric = value === null ? "" : Number(value);
                  onChange({ productPrice: numeric });
                }}
                min={0}
                step={0.01}
              />

              <NumberInput
                label={t("modal.productStockLabel")}
                placeholder={t("modal.productStockPlaceholder")}
                isRequired
                errorMessage={t("modal.errorMsgInputFieldEmpty")}
                minValue={0}
                maxValue={1000000}
                value={data.productStock}
                onValueChange={(value) => {
                  const numeric = value === null ? "" : Number(value);
                  onChange({ productStock: numeric });
                }}
                min={0}
                step={1}
              />
            </div>

            <ImageUploader
              title=""
              uploadText={t("modal.productImageUpload")}
              uploadDescription={t("modal.productImageUploadMessage")}
              onChange={(file) => onChange({ productImage: file, productImageRemoved: file === null })}
              value={data.productImageRemoved ? null : (data.productImage || data.productImageUrl)}
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
                isLoading={isSubmitting || isUploading}
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
