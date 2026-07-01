"use client";

import { Card, CardBody, Chip, Image } from "@heroui/react";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { VariantsButton } from "@/components/shared/VariantsButton";
import { ViewButton } from "@/components/shared/ViewButton";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";
import { RequirePermission } from "@/hooks/usePermission";

import { getProductStockQuantity, getProductStockStatus, getStockChipClassName } from "./utils/productStockStatus";

export function ProductsCard({ product, canManageProducts, onEditProduct, onDeleteProduct, onViewProduct, onManageVariants }) {
  const productsTranslations = useTranslations("products");
  const { formatAmount } = useCurrency();
  const imageUrl = storedAssetUrl(product?.imageUrl);
  const stockQuantity = getProductStockQuantity(product);
  const stockStatus = getProductStockStatus(product);
  const stockChipClassName = getStockChipClassName(stockStatus);

  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="flex flex-row items-stretch gap-3 p-3 justify-between">
        <div className="flex justify-center w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
          {imageUrl ? (
            <Image
              removeWrapper
              src={imageUrl}
              alt={product.name}
              className="w-full object-cover"
            />
          ) : (
            <div className="flex justify-center items-center" data-testid={`product-card-image-placeholder-${product.id}`}>
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <p className="font-medium wrap-break-word text-sm my-1">{product.name}</p>
          <p className="text-green-800 font-semibold text-sm my-1">{formatAmount(product.priceCents)}</p>
          <div className="flex flex-wrap gap-1.5 my-1">
            <Chip
              className={stockChipClassName}
              size="sm"
            >
              {stockQuantity}
            </Chip>
            <Chip
              className={stockChipClassName}
              size="sm"
            >
              {productsTranslations(`status.${stockStatus}`)}
            </Chip>
          </div>
        </div>
        <div className="flex flex-col justify-between shrink-0 gap-1">
          <ViewButton onPress={() => onViewProduct(product)} aria-label={productsTranslations("viewDetails")} />
          {canManageProducts && (
            <>
              {product.hasVariants && (
                <RequirePermission allOf={["products_update"]}>
                  <VariantsButton onPress={() => onManageVariants(product)} aria-label={productsTranslations("manageVariants")} />
                </RequirePermission>
              )}
              <RequirePermission allOf={["products_update"]}>
                <EditButton onPress={() => onEditProduct(product)} aria-label={productsTranslations("edit")} />
              </RequirePermission>
              <RequirePermission allOf={["products_delete"]}>
                <DeleteButton onPress={() => onDeleteProduct(product)} aria-label={productsTranslations("delete")} />
              </RequirePermission>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
