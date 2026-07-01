"use client";
import { useEffect } from "react";

import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useProductVariants } from "@components/pages/Store/hooks/useProductVariants";

import { useEditProduct } from "./hooks/useEditProduct";
import { VariantManager } from "./VariantManager";

export function ProductVariantsModal({ product, isOpen, onClose }) {
  const productsTranslations = useTranslations("products");

  const {
    fetchProductDetail,
    addVariant,
    updateVariant,
    deleteVariant,
    addOptionType,
    updateOptionType,
    deleteOptionType,
  } = useProductVariants();

  const { productVariants, productOptions, loadProductDetail } = useEditProduct({ fetchProductDetail });

  useEffect(() => {
    if (isOpen && product?.id) {
      loadProductDetail(product.id);
    }
  }, [isOpen, product?.id, loadProductDetail]);

  const handleRefresh = () => {
    if (product?.id) loadProductDetail(product.id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(modalIsOpen) => { if (!modalIsOpen) onClose(); }}
      backdrop="blur"
      shouldBlockScroll={false}
      size="lg"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
        body: "overflow-y-auto max-h-[70vh]",
      }}
      placement="center"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-0.5">
          <span>{productsTranslations("variantsModalTitle")}</span>
          {product?.name && (
            <span className="text-sm font-normal text-gray-500">{product.name}</span>
          )}
        </ModalHeader>
        <ModalBody className="pb-6">
          <VariantManager
            productId={product?.id}
            variants={productVariants}
            options={productOptions}
            onAddVariant={addVariant}
            onUpdateVariant={updateVariant}
            onDeleteVariant={deleteVariant}
            onAddOptionType={addOptionType}
            onUpdateOptionType={updateOptionType}
            onDeleteOptionType={deleteOptionType}
            onRefresh={handleRefresh}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
