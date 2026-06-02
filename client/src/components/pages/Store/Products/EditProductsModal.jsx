"use client";
import { useEffect, useState } from "react";

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
import { useProductVariants } from "@components/pages/Store/hooks/useProductVariants";

import { CategorySelector } from "./CategorySelector";
import { ProductPricingFields } from "./ProductPricingFields";
import { VariantManager } from "./VariantManager";
import { useEditProduct } from "./hooks/useEditProduct";

export function EditProductsModal({
  data,
  onChange,
  updateProduct,
  onProductUpdated,
  isUploading = false,
  categories = [],
  categoriesLoading = false,
  createCategory,
  editProductsShowModal,
  onClose,
}) {
  const t = useTranslations("products");
  const { currency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { fetchProductDetail, addVariant, updateVariant, deleteVariant } = useProductVariants();
  const { productVariants, loadProductVariants } = useEditProduct({ fetchProductDetail });

  useEffect(() => {
    if (editProductsShowModal && data.productId) {
      loadProductVariants(data.productId);
    }
  }, [editProductsShowModal, data.productId, loadProductVariants]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isUploading) return;

    try {
      setIsSubmitting(true);
      await updateProduct(data);
      onClose?.();
      onProductUpdated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={editProductsShowModal}
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
        <ModalHeader>{t("modal.titleEdit")}</ModalHeader>

        <ModalBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label={t("modal.productNameLabel")}
              placeholder={t("modal.productNamePlaceholder")}
              isRequired
              errorMessage={t("modal.errorMsgInputFieldEmpty")}
              value={data.productName}
              onChange={(e) => onChange({ productName: e.target.value })}
            />

            <Textarea
              label={t("modal.productDescriptionLabel")}
              placeholder={t("modal.productDescriptionPlaceholder")}
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
              label={t("modal.productSKULabel")}
              placeholder={t("modal.productSKUPlaceholder")}
              value={data.productSKU}
              onChange={(e) => onChange({ productSKU: e.target.value })}
            />

            <div className="flex items-center gap-3">
              <Switch
                isSelected={data.hasVariants ?? false}
                onValueChange={(val) => onChange({ hasVariants: val })}
                size="sm"
                isDisabled={productVariants.length > 1}
              />
              <span className="text-sm text-gray-700">{t("hasVariants")}</span>
            </div>

            {!data.hasVariants && (
              <ProductPricingFields data={data} onChange={onChange} currency={currency} />
            )}

            {data.hasVariants && (
              <VariantManager
                productId={data.productId}
                variants={productVariants}
                onAddVariant={addVariant}
                onUpdateVariant={updateVariant}
                onDeleteVariant={deleteVariant}
                onRefresh={() => loadProductVariants(data.productId)}
              />
            )}

            <ImageUploader
              title=""
              uploadText={t("modal.productImageUpload")}
              uploadDescription={t("modal.productImageUploadMessage")}
              onChange={(file) => onChange({ productImage: file, productImageRemoved: file === null })}
              image={data.productImageRemoved ? null : (data.productImage || data.productImageUrl)}
            />

            <ModalFooter className="flex justify-between p-0 my-4">
              <Button
                variant="bordered"
                type="button"
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onPress={() => onClose?.()}
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
