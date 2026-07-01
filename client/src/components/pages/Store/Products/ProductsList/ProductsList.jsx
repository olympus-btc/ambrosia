"use client";

import { useMemo, useState } from "react";

import { ProductDetailsModal } from "@/components/shared/ProductDetailsModal";
import { usePermission } from "@/hooks/usePermission";

import { ProductsCard } from "./ProductsCard";
import { ProductsTable } from "./ProductsTable";
import { buildCategoryNameById } from "./utils/productCategories";

export function ProductsList({ products, categories = [], onEditProduct, onDeleteProduct, onManageVariants }) {
  const canManageProducts = usePermission({ anyOf: ["products_update", "products_delete"] });
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleViewProductDetails = (product) => {
    setSelectedProduct(product);
    setShowProductDetails(true);
  };

  const categoryNameById = useMemo(() => buildCategoryNameById(categories), [categories]);

  return (
    <>
      <section className="w-full">
        <div className="md:hidden space-y-3">
          {products.map((product) => (
            <ProductsCard
              key={product.id}
              product={product}
              canManageProducts={canManageProducts}
              onEditProduct={onEditProduct}
              onDeleteProduct={onDeleteProduct}
              onViewProduct={handleViewProductDetails}
              onManageVariants={onManageVariants}
            />
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <ProductsTable
            products={products}
            categoryNameById={categoryNameById}
            canManageProducts={canManageProducts}
            onEditProduct={onEditProduct}
            onDeleteProduct={onDeleteProduct}
            onViewProduct={handleViewProductDetails}
            onManageVariants={onManageVariants}
          />
        </div>
      </section>

      <ProductDetailsModal
        isOpen={showProductDetails}
        onClose={() => setShowProductDetails(false)}
        showAddButton={false}
        product={selectedProduct}
        categories={categories}
      />
    </>
  );
}
