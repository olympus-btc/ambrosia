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
  Select,
  SelectItem,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { ImageUploader } from "@components/shared/ImageUploader";

export function AddProductsModal({
  data,
  setData,
  addProduct,
  onChange,
  onProductCreated,
  isUploading = false,
  categories = [],
  categoriesLoading = false,
  createCategory,
  addProductsShowModal,
  setAddProductsShowModal,
}) {
  const t = useTranslations("products");
  const { currency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isUploading) return;

    try {
      setIsSubmitting(true);
      await addProduct(data);
      setData({
        productName: "",
        productDescription: "",
        productCategory: "",
        productSKU: "",
        productPrice: "",
        productStock: "",
        productMinStock: 0,
        productMaxStock: 0,
        productImage: null,
        productImageUrl: "",
      });
      setAddProductsShowModal(false);
      onProductCreated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || isCreatingCategory) return;
    try {
      setIsCreatingCategory(true);
      const newId = await createCategory(newCategoryName.trim());
      if (newId) {
        onChange({ productCategory: newId });
      }
      setNewCategoryName("");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  return (
    <Modal
      isOpen={addProductsShowModal}
      onOpenChange={setAddProductsShowModal}
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
    >
      <ModalContent>
        <ModalHeader>{t("modal.titleAdd")}</ModalHeader>

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
              value={data.productDescription}
              isRequired
              errorMessage={t("modal.errorMsgInputFieldEmpty")}
              onChange={(e) => onChange({ productDescription: e.target.value })
              }
            />

            <div className="space-y-4">
              <Select
                label={t("modal.productCategoryLabel")}
                placeholder={t("modal.categorySelectPlaceholder")}
                selectedKeys={data.productCategory ? [data.productCategory] : []}
                isRequired
                errorMessage={t("modal.errorMsgInputFieldEmpty")}
                onChange={(e) => onChange({ productCategory: e.target.value })
                }
                isLoading={categoriesLoading}
              >
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </Select>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                <Input
                  label={t("modal.createCategoryLabel")}
                  placeholder={t("modal.createCategoryPlaceholder")}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <Button
                  color="primary"
                  className="bg-green-800 h-full"
                  onPress={handleCreateCategory}
                  isLoading={isCreatingCategory}
                >
                  {t("modal.createCategoryButton")}
                </Button>
              </div>
            </div>

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
                minValue={0}
                value={data.productStock}
                isRequired
                errorMessage={t("modal.errorMsgInputFieldEmpty")}
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
              onChange={(file) => onChange({ productImage: file })}
              value={data.productImage || data.productImageUrl}
            />

            <ModalFooter className="flex justify-between p-0 my-4">
              <Button
                variant="bordered"
                type="button"
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onPress={() => setAddProductsShowModal(false)}
              >
                {t("modal.cancelButton")}
              </Button>

              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
                isLoading={isSubmitting || isUploading}
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
