"use client";

import { useState } from "react";

import {
  Button,
  Input,
  NumberInput,
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

import { BundleProductSelector } from "./BundleProductSelector";
import { CategorySelector } from "./CategorySelector";

export function AddProductsModal({
  data,
  allProducts,
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
  const productsTranslation = useTranslations("products");
  const { currency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
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

  const handleBundleToggle = (checked) => {
    onChange({
      isBundle: checked,
      bundleComponents: [],
      productStock: 0,
      productMinStock: 0,
      productMaxStock: 0,
    });
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
        <ModalHeader>{productsTranslation("modal.titleAdd")}</ModalHeader>

        <ModalBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Switch
              isSelected={data.isBundle}
              onValueChange={handleBundleToggle}
            >
              {productsTranslation("modal.isBundle")}
            </Switch>

            <Input
              label={productsTranslation("modal.productNameLabel")}
              placeholder={productsTranslation("modal.productNamePlaceholder")}
              isRequired
              errorMessage={productsTranslation("modal.errorMsgInputFieldEmpty")}
              value={data.productName}
              onChange={(event) => onChange({ productName: event.target.value })}
            />

            <Textarea
              label={productsTranslation("modal.productDescriptionLabel")}
              placeholder={productsTranslation("modal.productDescriptionPlaceholder")}
              value={data.productDescription}
              onChange={(event) => onChange({ productDescription: event.target.value })}
            />

            <CategorySelector
              categories={categories}
              categoriesLoading={categoriesLoading}
              selectedCategories={data.productCategories}
              onSelectionChange={(keys) => onChange({ productCategories: keys })}
              createCategory={createCategory}
            />

            <Input
              label={productsTranslation("modal.productSKULabel")}
              placeholder={productsTranslation("modal.productSKUPlaceholder")}
              value={data.productSKU}
              onChange={(event) => onChange({ productSKU: event.target.value })}
            />

            <NumberInput
              label={productsTranslation("modal.productPriceLabel")}
              placeholder={productsTranslation("modal.productPricePlaceholder")}
              isRequired
              errorMessage={productsTranslation("modal.errorMsgInputFieldEmpty")}
              startContent={(
                <span className="text-default-400 text-small">
                  {currency?.acronym || "$"}
                </span>
              )}
              minValue={0}
              value={data.productPrice}
              classNames={{ inputWrapper: "shadow-none" }}
              onValueChange={(value) => {
                const numeric = value === null ? "" : Number(value);
                onChange({ productPrice: numeric });
              }}
              step={0.01}
            />

            {!data.isBundle && (
              <NumberInput
                label={productsTranslation("modal.productStockLabel")}
                placeholder={productsTranslation("modal.productStockPlaceholder")}
                value={data.productStock}
                minValue={0}
                maxValue={1000000}
                isRequired
                errorMessage={productsTranslation("modal.errorMsgInputFieldEmpty")}
                classNames={{ inputWrapper: "shadow-none" }}
                onValueChange={(value) => {
                  const numeric = value === null ? "" : Number(value);
                  onChange({ productStock: numeric });
                }}
                step={1}
              />
            )}

            {data.isBundle && (
              <BundleProductSelector
                selectedProducts={data.bundleComponents ?? []}
                allProducts={allProducts ?? []}
                onComponentsChange={(bundleComponents) => onChange({ bundleComponents })}
              />
            )}

            <ImageUploader
              title=""
              uploadText={productsTranslation("modal.productImageUpload")}
              uploadDescription={productsTranslation("modal.productImageUploadMessage")}
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
                {productsTranslation("modal.cancelButton")}
              </Button>

              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
                isLoading={isSubmitting || isUploading}
              >
                {productsTranslation("modal.submitButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
