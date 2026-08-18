"use client";

import { useState } from "react";

import {
  addToast,
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

import { BundleProductSelector } from "./BundleProductSelector";
import { CategorySelector } from "./CategorySelector";
import { ProductPricingFields } from "./ProductPricingFields";

export function AddProductsModal({
  productForm,
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
  const productsTranslations = useTranslations("products");
  const { currency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (productFormSubmission) => {
    productFormSubmission.preventDefault();
    if (isSubmitting || isUploading) return;

    try {
      setIsSubmitting(true);
      await addProduct(productForm);
      addToast({ description: productsTranslations("toasts.createSuccess"), color: "success" });
      onClose?.();
      onProductCreated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBundleToggle = (isBundleSelected) => {
    onChange({
      isBundle: isBundleSelected,
      hasVariants: isBundleSelected ? false : productForm.hasVariants,
      bundleComponents: [],
      trackStock: isBundleSelected ? true : productForm.trackStock,
      productStock: isBundleSelected ? 0 : productForm.productStock,
      productMinStock: isBundleSelected ? 0 : productForm.productMinStock,
      productMaxStock: isBundleSelected ? 0 : productForm.productMaxStock,
    });
  };

  const handleTrackStockToggle = (isStockTrackingSelected) => {
    onChange({
      trackStock: isStockTrackingSelected,
      productStock: isStockTrackingSelected ? productForm.productStock : 0,
      productMinStock: isStockTrackingSelected ? productForm.productMinStock : 0,
      productMaxStock: isStockTrackingSelected ? productForm.productMaxStock : 0,
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
        <ModalHeader>{productsTranslations("modal.titleAdd")}</ModalHeader>

        <ModalBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Switch
              isSelected={productForm.isBundle}
              onValueChange={handleBundleToggle}
            >
              {productsTranslations("modal.isBundle")}
            </Switch>

            <Input
              label={productsTranslations("modal.productNameLabel")}
              placeholder={productsTranslations("modal.productNamePlaceholder")}
              isRequired
              errorMessage={productsTranslations("modal.errorMsgInputFieldEmpty")}
              value={productForm.productName}
              onChange={({ target: productNameInput }) => onChange({ productName: productNameInput.value })}
            />

            <Textarea
              label={productsTranslations("modal.productDescriptionLabel")}
              placeholder={productsTranslations("modal.productDescriptionPlaceholder")}
              value={productForm.productDescription}
              onChange={({ target: productDescriptionInput }) => onChange({ productDescription: productDescriptionInput.value })}
            />

            <CategorySelector
              categories={categories}
              categoriesLoading={categoriesLoading}
              selectedCategories={productForm.productCategories}
              onSelectionChange={(keys) => onChange({ productCategories: keys })}
              createCategory={createCategory}
            />

            <Input
              label={productsTranslations("modal.productSKULabel")}
              placeholder={productsTranslations("modal.productSKUPlaceholder")}
              value={productForm.productSKU}
              onChange={({ target: productSkuInput }) => onChange({ productSKU: productSkuInput.value })}
            />

            {!productForm.isBundle && (
              <div className="flex items-center gap-3">
                <Switch
                  isSelected={productForm.trackStock ?? true}
                  onValueChange={handleTrackStockToggle}
                  size="sm"
                  aria-label={productsTranslations("trackStock")}
                />
                <span className="text-sm text-gray-700">{productsTranslations("trackStock")}</span>
              </div>
            )}

            {!productForm.isBundle && (
              <div className="flex items-center gap-3">
                <Switch
                  isSelected={productForm.hasVariants ?? false}
                  onValueChange={(hasVariantsSelected) => onChange({ hasVariants: hasVariantsSelected })}
                  size="sm"
                />
                <span className="text-sm text-gray-700">{productsTranslations("hasVariants")}</span>
              </div>
            )}

            {!productForm.hasVariants && (
              <ProductPricingFields
                productForm={productForm}
                onChange={onChange}
                currency={currency}
                includeStock={!productForm.isBundle && (productForm.trackStock ?? true)}
              />
            )}

            {productForm.hasVariants && !productForm.isBundle && (
              <p className="text-xs text-gray-400">{productsTranslations("hasVariantsHint")}</p>
            )}

            {productForm.isBundle && (
              <BundleProductSelector
                selectedProducts={productForm.bundleComponents ?? []}
                allProducts={allProducts ?? []}
                onComponentsChange={(bundleComponents) => onChange({ bundleComponents })}
              />
            )}

            <ImageUploader
              title=""
              uploadText={productsTranslations("modal.productImageUpload")}
              uploadDescription={productsTranslations("modal.productImageUploadMessage")}
              onChange={(file) => onChange({ productImage: file })}
              image={productForm.productImage || productForm.productImageUrl}
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
