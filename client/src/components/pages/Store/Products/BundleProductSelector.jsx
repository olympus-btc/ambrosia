"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Input, NumberInput, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { useProductVariants } from "@/components/pages/Store/hooks/useProductVariants";
import {
  calculateComponentsPriceCents,
  resolveActiveComponentVariants,
} from "@/components/pages/Store/utils/bundleComponentsPrice";
import { deriveVariantDisplayName } from "@/components/pages/Store/utils/productVariantOptionValues";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { toNumberInputValue } from "@/components/utils/numberParsers";

export function BundleProductSelector({ selectedProducts, allProducts, onComponentsChange }) {
  const productsTranslation = useTranslations("products");
  const { formatAmount } = useCurrency();
  const { fetchProductDetail } = useProductVariants();
  const [searchQuery, setSearchQuery] = useState("");
  const [componentDetailByProductId, setComponentDetailByProductId] = useState({});

  const productById = useMemo(
    () => new Map(allProducts.map((product) => [product.id, product])),
    [allProducts],
  );

  const selectableProducts = allProducts.filter(
    (product) => !product.isBundle &&
      !selectedProducts.some((selectedProduct) => selectedProduct.productId === product.id),
  );

  const normalizedSearchQuery = searchQuery.toLowerCase();
  const filteredProducts = selectableProducts.filter((product) => (
    product.name.toLowerCase().includes(normalizedSearchQuery) ||
    product.SKU?.toLowerCase().includes(normalizedSearchQuery)
  ));

  const resolveProduct = useCallback((productId) => productById.get(productId), [productById]);
  const activeVariantsForProduct = (productId) => (
    resolveActiveComponentVariants(componentDetailByProductId[productId])
  );

  const variantLabel = (productId, variant) => {
    const componentDetail = componentDetailByProductId[productId];
    return deriveVariantDisplayName(variant.optionValueIds, componentDetail?.options) ?? variant.SKU ?? formatAmount(variant.priceCents);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadMissingComponentDetails = async () => {
      const productsThatNeedDetails = selectedProducts
        .map((selectedProduct) => resolveProduct(selectedProduct.productId))
        .filter((product) => product?.hasVariants && !componentDetailByProductId[product.id]);

      for (const product of productsThatNeedDetails) {
        const productDetail = await fetchProductDetail(product.id);
        if (isCancelled || !productDetail) return;
        setComponentDetailByProductId((previousComponentDetails) => ({
          ...previousComponentDetails,
          [product.id]: productDetail,
        }));
      }
    };

    loadMissingComponentDetails();

    return () => {
      isCancelled = true;
    };
  }, [componentDetailByProductId, fetchProductDetail, resolveProduct, selectedProducts]);

  const componentsPriceCents = calculateComponentsPriceCents(
    selectedProducts,
    productById,
    componentDetailByProductId,
  );

  const handleAddProduct = async (product) => {
    const productDetail = product.hasVariants ? await fetchProductDetail(product.id) : null;
    const activeVariants = resolveActiveComponentVariants(productDetail);
    if (productDetail) {
      setComponentDetailByProductId((previousComponentDetails) => ({
        ...previousComponentDetails,
        [product.id]: productDetail,
      }));
    }

    onComponentsChange([
      ...selectedProducts,
      {
        productId: product.id,
        ...(activeVariants[0]?.id ? { variantId: activeVariants[0].id } : {}),
        quantity: 1,
      },
    ]);
    setSearchQuery("");
  };

  const handleRemoveProduct = (productId) => {
    onComponentsChange(selectedProducts.filter((selectedProduct) => selectedProduct.productId !== productId));
  };

  const handleQuantityChange = (productId, newQuantity) => {
    const validatedQuantity = Math.max(1, newQuantity || 1);
    onComponentsChange(
      selectedProducts.map((selectedProduct) => (selectedProduct.productId === productId
        ? { ...selectedProduct, quantity: validatedQuantity }
        : selectedProduct),
      ),
    );
  };

  const handleVariantChange = (productId, variantId) => {
    onComponentsChange(
      selectedProducts.map((selectedProduct) => (selectedProduct.productId === productId
        ? { ...selectedProduct, variantId }
        : selectedProduct),
      ),
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          label={productsTranslation("modal.bundleComponentsLabel")}
          placeholder={productsTranslation("modal.bundleComponentsSearchPlaceholder")}
          value={searchQuery}
          classNames={{ inputWrapper: "shadow-none" }}
          onChange={(event) => setSearchQuery(event.target.value)}
        />

        {searchQuery && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 text-left"
                  onClick={() => handleAddProduct(product)}
                >
                  <span>{product.name}</span>
                  {product.SKU && (
                    <span className="text-gray-400 text-xs ml-2 shrink-0">{product.SKU}</span>
                  )}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-gray-400">
                {productsTranslation("modal.bundleComponentsNotFound")}
              </p>
            )}
          </div>
        )}
      </div>

      {selectedProducts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-2">
          {productsTranslation("modal.bundleComponentsEmpty")}
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {selectedProducts.map((selectedProduct) => {
            const product = resolveProduct(selectedProduct.productId);
            if (!product) return null;
            const componentVariants = activeVariantsForProduct(selectedProduct.productId);
            const hasComponentVariants = componentVariants.length > 0;
            return (
              <div
                key={selectedProduct.productId}
                className={`grid grid-cols-[minmax(0,1fr)_7rem_2.5rem] gap-3 py-3 ${
                  hasComponentVariants ? "items-end" : "items-center"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-medium text-green-900">{product.name}</span>
                  {hasComponentVariants && (
                    <Select
                      aria-label={productsTranslation("modal.bundleComponentVariantLabel")}
                      size="sm"
                      className="mt-1"
                      classNames={{
                        trigger: "min-h-12 h-12 shadow-none",
                        value: "text-sm text-green-900",
                      }}
                      selectedKeys={selectedProduct.variantId ? [selectedProduct.variantId] : []}
                      onSelectionChange={(selectedKeys) => handleVariantChange(selectedProduct.productId, [...selectedKeys][0])}
                    >
                      {componentVariants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variantLabel(selectedProduct.productId, variant)}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                </div>
                <NumberInput
                  aria-label={productsTranslation("modal.bundleComponentQuantityLabel")}
                  size="sm"
                  className="w-full"
                  classNames={{ inputWrapper: "min-h-12 h-12 shadow-none" }}
                  minValue={1}
                  value={selectedProduct.quantity}
                  onValueChange={(newQuantity) => handleQuantityChange(selectedProduct.productId, newQuantity)}
                  onChange={(quantityChange) => handleQuantityChange(selectedProduct.productId, toNumberInputValue(quantityChange))}
                />
                <div className="flex h-12 items-center justify-end">
                  <DeleteButton
                    onPress={() => handleRemoveProduct(selectedProduct.productId)}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-gray-500 text-right pt-2">
            {productsTranslation("modal.bundleComponentsPriceReference")} {formatAmount(componentsPriceCents)}
          </p>
        </div>
      )}
    </div>
  );
}
