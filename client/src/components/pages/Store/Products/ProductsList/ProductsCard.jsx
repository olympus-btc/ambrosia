"use client";

import { Button, Card, CardBody, Chip, Image } from "@heroui/react";
import { Pencil, Trash } from "lucide-react";
import { useTranslations } from "next-intl";

import { storedAssetUrl } from "@/components/utils/storedAssetUrl";
import { RequirePermission } from "@/hooks/usePermission";

export function ProductsCard({ product, status, normalizeNumber, formatAmount, canManageProducts, onEditProduct, onDeleteProduct }) {
  const t = useTranslations("products");

  return (
    <Card className="shadow-none border border-green-800">
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
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs"
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
              <Button
                aria-label="Edit Product"
                isIconOnly
                size="sm"
                className="text-xs text-white bg-blue-500"
                onPress={() => onEditProduct(product)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </RequirePermission>
            <RequirePermission allOf={["products_delete"]}>
              <Button
                aria-label="Delete Product"
                isIconOnly
                size="sm"
                color="danger"
                className="text-xs text-white"
                onPress={() => onDeleteProduct(product)}
              >
                <Trash className="w-4 h-4" />
              </Button>
            </RequirePermission>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
