"use client";

import { useState } from "react";

import { Input, NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { DeleteButton } from "@/components/shared/DeleteButton";

export function BundleProductSelector({ selectedProducts, allProducts, onComponentsChange }) {
  const productsTranslation = useTranslations("products");
  const { formatAmount } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");

  const selectableProducts = allProducts.filter(
    (product) => !product.isBundle &&
      !selectedProducts.some((selectedProduct) => selectedProduct.productId === product.id),
  );

  const normalizedSearchQuery = searchQuery.toLowerCase();
  const filteredProducts = selectableProducts.filter((product) => (
    product.name.toLowerCase().includes(normalizedSearchQuery) ||
    product.SKU?.toLowerCase().includes(normalizedSearchQuery)
  ));

  const resolveProduct = (productId) => allProducts.find((product) => product.id === productId);

  const bundleCostCents = selectedProducts.reduce((accumulatedCents, selectedProduct) => {
    const product = resolveProduct(selectedProduct.productId);
    return accumulatedCents + (product?.costCents ?? 0) * selectedProduct.quantity;
  }, 0);

  const handleAddProduct = (product) => {
    onComponentsChange([...selectedProducts, { productId: product.id, quantity: 1 }]);
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
            return (
              <div
                key={selectedProduct.productId}
                className="flex items-center gap-3 py-2"
              >
                <span className="flex-1 text-sm truncate">{product.name}</span>
                <NumberInput
                  aria-label={productsTranslation("modal.bundleComponentQuantityLabel")}
                  size="sm"
                  className="w-24 shrink-0"
                  classNames={{ inputWrapper: "shadow-none" }}
                  minValue={1}
                  value={selectedProduct.quantity}
                  onValueChange={(newQuantity) => handleQuantityChange(selectedProduct.productId, newQuantity)}
                  onChange={(event) => handleQuantityChange(selectedProduct.productId, Number(event.target.value))}
                />
                <DeleteButton
                  onPress={() => handleRemoveProduct(selectedProduct.productId)}
                />
              </div>
            );
          })}
          <p className="text-xs text-gray-500 text-right pt-2">
            {productsTranslation("modal.bundleCostReference")} {formatAmount(bundleCostCents)}
          </p>
        </div>
      )}
    </div>
  );
}
