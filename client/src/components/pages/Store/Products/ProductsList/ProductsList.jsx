"use client";

import { useMemo } from "react";

import { useCurrency } from "@/components/hooks/useCurrency";
import { usePermission } from "@/hooks/usePermission";

import { ProductsCard } from "./ProductsCard";
import { ProductsTable } from "./ProductsTable";

export function ProductsList({ products, categories = [], onEditProduct, onDeleteProduct }) {
  const { formatAmount } = useCurrency();
  const canManageProducts = usePermission({ anyOf: ["products_update", "products_delete"] });
  const defaultMaxStock = 11;

  const categoryNameById = useMemo(() => categories.reduce((map, category) => {
    map[String(category.id)] = category.name;
    return map;
  }, {}), [categories]);

  const normalizeNumber = (value, fallback = 0) => {
    const numeric = Number(value ?? fallback);
    return Number.isFinite(numeric) ? numeric : fallback;
  };

  const stockStatus = (product) => {
    const quantity = normalizeNumber(product.quantity ?? product.productStock);
    if (quantity <= 0) return "out";
    if (quantity < defaultMaxStock) return "low";
    return "ok";
  };

  return (
    <section className="w-full">
      <div className="md:hidden space-y-3">
        {products.map((product) => (
          <ProductsCard
            key={product.id}
            product={product}
            status={stockStatus(product)}
            normalizeNumber={normalizeNumber}
            formatAmount={formatAmount}
            canManageProducts={canManageProducts}
            onEditProduct={onEditProduct}
            onDeleteProduct={onDeleteProduct}
          />
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <ProductsTable
          products={products}
          categoryNameById={categoryNameById}
          status={stockStatus}
          normalizeNumber={normalizeNumber}
          formatAmount={formatAmount}
          canManageProducts={canManageProducts}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
        />
      </div>
    </section>
  );
}
