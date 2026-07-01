"use client";
import { Button, Chip, Image, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";

export function ProductDetailsModal({ isOpen, onClose, onAddProduct, showAddButton = true, product, categories = [] }) {
  const productDetailsTranslation = useTranslations("productDetails");
  const { formatAmount } = useCurrency();

  if (!product) return null;

  const imageUrl = storedAssetUrl(product.imageUrl);
  const categoryIds = product.categoryIds ?? [];
  const categoryNames = categories
    .filter((cat) => categoryIds.includes(cat.id))
    .map((cat) => cat.name)
    .join(", ") || productDetailsTranslation("unknownCategory");

  const quantity = Number(product.quantity ?? 0);
  const isOutOfStock = quantity <= 0;

  const stockChipClassName = isOutOfStock
    ? "bg-rose-100 text-rose-800 border border-rose-200 text-xs"
    : quantity < 11
      ? "bg-amber-100 text-amber-800 border border-amber-200 text-xs"
      : "bg-green-200 text-xs text-green-800 border border-green-300";

  const handleAddToCart = () => {
    onAddProduct?.(product);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      scrollBehavior="inside"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
      }}
    >
      <ModalContent>
        {imageUrl ? (
          <div className="h-56 bg-gray-100 overflow-hidden flex items-center justify-center">
            <Image
              removeWrapper
              alt={product.name}
              src={imageUrl}
              className="w-full h-full object-cover rounded-none"
            />
          </div>
        ) : (
          <div className="h-56 bg-gray-100 flex items-center justify-center">
            <ImageIcon className="h-16 w-16 text-gray-300" aria-hidden="true" />
          </div>
        )}

        <ModalHeader className="flex flex-col pb-2">
          <div className="flex items-center justify-between">
            {product.name}
            {product.isBundle && (
              <Chip size="sm" className="bg-blue-100 text-xs text-blue-800 border border-blue-200">
                {productDetailsTranslation("bundle")}
              </Chip>
            )}
          </div>
          <span className="text-sm font-normal text-gray-500">{categoryNames}</span>
        </ModalHeader>

        <ModalBody className="space-y-3 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-800">{formatAmount(product.priceCents)}</h2>
              <p className="text-xs">
                SKU: <span className="text-gray-800">{product.SKU ?? "—"}</span>
              </p>
            </div>
            <Chip size="sm" className={stockChipClassName}>
              {quantity} {productDetailsTranslation("stock")}
            </Chip>
          </div>

          {product.description && (
            <div>
              <p className="text-xs tracking-wide text-primary mb-1">
                {productDetailsTranslation("description")}
              </p>
              <p className="text-xs text-gray-400">{product.description}</p>
            </div>
          )}
        </ModalBody>

        <ModalFooter className={showAddButton ? "flex justify-between" : "flex justify-end"}>
          <Button variant="outline" size="sm" className="border border-green-800 text-green-800" onPress={onClose}>
            {productDetailsTranslation("close")}
          </Button>
          {showAddButton && (
            <Button
              color="primary"
              className="bg-green-800"
              isDisabled={isOutOfStock}
              onPress={handleAddToCart}
            >
              {productDetailsTranslation("add")}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
