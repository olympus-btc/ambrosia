"use client";

import { useState } from "react";

import {
  Button,
  Input,
  Switch,
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
import { ProductPricingFields } from "./ProductPricingFields";

export function AddProductsModal({
  data,
  addProduct,
  onChange,
  onProductCreated,
  isUploading = false,
  categories = [],
  categoriesLoading = false,
  createCategory,
  addProductsShowModal,
  onClose,
}) {
  const productsTranslations = useTranslations("products");
  const { currency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isUploading) return;

    try {
      setIsSubmitting(true);
      await addProduct(data);
      onClose?.();
      onProductCreated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={addProductsShowModal}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose?.();
      }}
      backdrop="blur"
      shouldBlockScroll={false}
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
        body: "overflow-y-auto max-h-[65vh]",
      }}
      placement="center"
    >
      <ModalContent>
        <ModalHeader>{productsTranslations("modal.titleAdd")}</ModalHeader>

        <ModalBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label={productsTranslations("modal.productNameLabel")}
              placeholder={productsTranslations("modal.productNamePlaceholder")}
              isRequired
              errorMessage={productsTranslations("modal.errorMsgInputFieldEmpty")}
              value={data.productName}
              onChange={(e) => onChange({ productName: e.target.value })}
            />

            <Textarea
              label={productsTranslations("modal.productDescriptionLabel")}
              placeholder={productsTranslations("modal.productDescriptionPlaceholder")}
              value={data.productDescription}
              onChange={(e) => onChange({ productDescription: e.target.value })}
            />

            <CategorySelector
              categories={categories}
              categoriesLoading={categoriesLoading}
              selectedCategories={data.productCategories}
              onSelectionChange={(keys) => onChange({ productCategories: keys })}
              createCategory={createCategory}
            />

            <Input
              label={productsTranslations("modal.productSKULabel")}
              placeholder={productsTranslations("modal.productSKUPlaceholder")}
              value={data.productSKU}
              onChange={(e) => onChange({ productSKU: e.target.value })}
            />

            <div className="flex items-center gap-3">
              <Switch
                isSelected={data.hasVariants ?? false}
                onValueChange={(val) => onChange({ hasVariants: val })}
                size="sm"
              />
              <span className="text-sm text-gray-700">{productsTranslations("hasVariants")}</span>
            </div>

            {!data.hasVariants && (
              <ProductPricingFields data={data} onChange={onChange} currency={currency} />
            )}

            {data.hasVariants && (
              <p className="text-xs text-gray-400">{productsTranslations("hasVariantsHint")}</p>
            )}

            <ImageUploader
              title=""
              uploadText={productsTranslations("modal.productImageUpload")}
              uploadDescription={productsTranslations("modal.productImageUploadMessage")}
              onChange={(file) => onChange({ productImage: file })}
              image={data.productImage || data.productImageUrl}
            />

            <ModalFooter className="flex justify-between p-0 my-4">
              <Button
                variant="bordered"
                type="button"
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onPress={() => onClose?.()}
              >
                {productsTranslations("modal.cancelButton")}
              </Button>

              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
                isLoading={isSubmitting || isUploading}
              >
                {productsTranslations("modal.submitButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
