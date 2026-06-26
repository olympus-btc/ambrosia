"use client";

import { Card, CardBody, Chip, Image } from "@heroui/react";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { ViewButton } from "@/components/shared/ViewButton";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";
import { RequirePermission } from "@/hooks/usePermission";

export function ProductsCard({ product, status, normalizeNumber, formatAmount, canManageProducts, onEditProduct, onDeleteProduct, onViewProduct }) {
  const t = useTranslations("products");
  const imageUrl = storedAssetUrl(product?.imageUrl);

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
              <ImageIcon aria-hidden="true" className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <p className="font-medium wrap-break-word text-sm my-1">{product.name}</p>
          <p className="text-green-800 font-semibold text-sm my-1">{formatAmount(product.priceCents)}</p>
          <div className="flex gap-1.5 my-1">
            <Chip
              className={
                status === "out"
                  ? "bg-rose-100 text-rose-800 border border-rose-200 text-xs"
                  : status === "low"
                    ? "bg-amber-100 text-amber-800 border border-amber-200 text-xs"
                    : "bg-green-200 text-xs text-green-800 border border-green-300"
              }
              size="sm"
            >
              {normalizeNumber(product.quantity ?? product.productStock)}
            </Chip>
            <Chip
              className={
                status === "out"
                  ? "bg-rose-100 text-rose-800 border border-rose-200 text-xs"
                  : status === "low"
                    ? "bg-amber-100 text-amber-800 border border-amber-200 text-xs"
                    : "bg-green-200 text-green-800 border border-green-300 text-xs"
              }
              size="sm"
            >
              {t(`status.${status}`)}
            </Chip>
          </div>
        </div>
        <div className="flex flex-col justify-between shrink-0 gap-1">
          <ViewButton onPress={() => onViewProduct(product)} aria-label={t("viewDetails")} />
          {canManageProducts && (
            <>
              <RequirePermission allOf={["products_update"]}>
                <EditButton onPress={() => onEditProduct(product)} aria-label={t("edit")} />
              </RequirePermission>
              <RequirePermission allOf={["products_delete"]}>
                <DeleteButton onPress={() => onDeleteProduct(product)} aria-label={t("delete")} />
              </RequirePermission>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
