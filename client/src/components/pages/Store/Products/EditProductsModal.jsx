"use client";
import { useState, useRef } from "react";

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
  Image,
} from "@heroui/react";
import { Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

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
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onChange({ storeImage: file, productImage: "" });

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    onChange({ storeImage: null, productImage: "" });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
      productCategory: "",
      productSKU: "",
      productPrice: "",
      productStock: "",
      productImage: "",
      storeImage: null,
    });

    setEditProductsShowModal(false);
  };

  return (
    <Modal
      isOpen={editProductsShowModal}
      onOpenChange={handleOnCloseModal}
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
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

            <div className="space-y-2">
              <Select
                label={t("modal.productCategoryLabel")}
                placeholder={t("modal.categorySelectPlaceholder")}
                isRequired
                errorMessage={t("modal.errorMsgSelectEmpty")}
                selectedKeys={data.productCategory ? [data.productCategory] : []}
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
                  className="bg-green-800"
                  onPress={async () => {
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
                  }}
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
                isRequired
                errorMessage={t("modal.errorMsgInputFieldEmpty")}
                minValue={0}
                value={data.productStock}
                onValueChange={(value) => {
                  const numeric = value === null ? "" : Number(value);
                  onChange({ productStock: numeric });
                }}
                min={0}
                step={1}
              />
            </div>

            <div>
              {imagePreview ? (
                <div className="relative w-32 h-32 rounded-lg border border-border overflow-hidden bg-muted">
                  <Image
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded hover:opacity-90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">
                    {t("modal.productImageUpload")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("modal.productImageUploadMessage")}
                  </p>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

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
