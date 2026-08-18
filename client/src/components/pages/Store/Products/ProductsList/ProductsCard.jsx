"use client";

import { Card, CardBody, Chip, Image } from "@heroui/react";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { getProductStockQuantity, getProductStockStatus, getStockChipClassName, isStockTracked } from "@/components/pages/Store/utils/productStockStatus";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { VariantsButton } from "@/components/shared/VariantsButton";
import { ViewButton } from "@/components/shared/ViewButton";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";
import { RequirePermission } from "@/hooks/usePermission";

export function ProductsCard({
  product,
  canManageProducts,
  onEditProduct,
  onDeleteProduct,
  onViewProduct,
  onManageVariants,
}) {
  const productsTranslation = useTranslations("products");
  const { formatAmount } = useCurrency();
  const imageUrl = storedAssetUrl(product?.imageUrl);
  const stockStatus = getProductStockStatus(product);
  const stockChipClassName = getStockChipClassName(stockStatus);
  const stockQuantityLabel = isStockTracked(product) ? getProductStockQuantity(product) : "N/A";

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
              {stockQuantityLabel}
            </Chip>
            <Chip
              className={stockChipClassName}
              size="sm"
            >
              {productsTranslation(`status.${stockStatus}`)}
            </Chip>
            {product.isBundle && (
              <Chip size="sm" className="bg-blue-100 text-xs text-blue-800 border border-blue-200">
                {productsTranslation("bundle")}
              </Chip>
            )}
            {product.hasVariants && !product.isBundle && (
              <Chip size="sm" className="bg-blue-100 text-xs text-blue-800 border border-blue-200">
                {productsTranslation("variants")}
              </Chip>
            )}
          </div>
        </div>
        <div className="flex flex-col justify-between shrink-0 gap-1">
          <ViewButton onPress={() => onViewProduct(product)} aria-label={productsTranslation("viewDetails")} />
          {canManageProducts && (
            <>
              {product.hasVariants && !product.isBundle && (
                <RequirePermission allOf={["products_update"]}>
                  <VariantsButton onPress={() => onManageVariants(product)} aria-label={productsTranslation("manageVariants")} />
                </RequirePermission>
              )}
              <RequirePermission allOf={["products_update"]}>
                <EditButton onPress={() => onEditProduct(product)} aria-label={productsTranslation("edit")} />
              </RequirePermission>
              <RequirePermission allOf={["products_delete"]}>
                <DeleteButton onPress={() => onDeleteProduct(product)} aria-label={productsTranslation("delete")} />
              </RequirePermission>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
