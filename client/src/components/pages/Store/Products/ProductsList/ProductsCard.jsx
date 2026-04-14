"use client";

import { Card, CardBody, Chip, Image } from "@heroui/react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";
import { RequirePermission } from "@/hooks/usePermission";

export function ProductsCard({ product, status, normalizeNumber, formatAmount, canManageProducts, onEditProduct, onDeleteProduct }) {
  const t = useTranslations("products");

  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="flex flex-row items-center gap-3 p-3">
        <Image
          src={storedAssetUrl(product?.image_url)}
          width={56}
          height={56}
          alt={product.name}
          className="rounded-md object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{product.name}</p>
          <p className="text-green-800 font-semibold text-sm mt-0.5">{formatAmount(product.price_cents)}</p>
          <div className="flex gap-1.5 mt-1">
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
        {canManageProducts && (
          <div className="flex flex-col gap-2 shrink-0">
            <RequirePermission allOf={["products_update"]}>
              <EditButton onPress={() => onEditProduct(product)} />
            </RequirePermission>
            <RequirePermission allOf={["products_delete"]}>
              <DeleteButton onPress={() => onDeleteProduct(product)} />
            </RequirePermission>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
