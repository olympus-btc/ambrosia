"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Image,
} from "@heroui/react";
import { Pencil, Trash } from "lucide-react";
import { useTranslations } from "next-intl";

import { storedAssetUrl } from "@/components/utils/storedAssetUrl";
import { RequirePermission } from "@/hooks/usePermission";

export function ProductsTable({ products, categoryNameById, status, normalizeNumber, formatAmount, canManageProducts, onEditProduct, onDeleteProduct }) {
  const t = useTranslations("products");

  return (
    <Table className="min-w-[700px]" removeWrapper aria-label={t("tableAriaLabel")}>
      <TableHeader>
        <TableColumn className="py-2 px-3 w-20">{t("image")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[50px]">{t("name")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[50px]">{t("description")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[100px]">{t("category")}</TableColumn>
        <TableColumn className="py-2 px-3 w-20">{t("sku")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[70px]">{t("price")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[60px]">{t("stock")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[90px]">{t("stockStatus")}</TableColumn>
        <TableColumn className={canManageProducts ? "py-2 px-3 w-[100px] text-right" : "hidden"}>{t("actions")}</TableColumn>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const productStatus = status(product);
          return (
            <TableRow key={product.id}>
              <TableCell>
                <Image src={storedAssetUrl(product?.image_url)} width={60} alt={product.name} />
              </TableCell>
              <TableCell>
                <span className="block max-w-[120px] truncate">{product.name}</span>
              </TableCell>
              <TableCell>
                <span className="block max-w-[50px] truncate">{product.description}</span>
              </TableCell>
              <TableCell>
                {product.category_ids?.some((catId) => categoryNameById[String(catId)]) ? (
                  <div className="flex flex-wrap gap-1">
                    {product.category_ids.filter((catId) => categoryNameById[String(catId)]).map((catId) => (
                      <Chip key={catId} className="bg-green-200 text-xs text-green-800 border border-green-300">
                        {categoryNameById[String(catId)]}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <Chip className="bg-gray-200 text-xs text-gray-500 border border-gray-300">
                    {t("noCategory")}
                  </Chip>
                )}
              </TableCell>
              <TableCell>
                <span className="whitespace-nowrap">{product.SKU}</span>
              </TableCell>
              <TableCell>
                <span className="whitespace-nowrap">{formatAmount(product.price_cents)}</span>
              </TableCell>
              <TableCell>
                <Chip
                  className={
                    productStatus === "out"
                      ? "bg-rose-100 text-rose-800 border border-rose-200 text-xs"
                      : productStatus === "low"
                        ? "bg-amber-100 text-amber-800 border border-amber-200 text-xs"
                        : "bg-green-200 text-xs text-green-800 border border-green-300"
                  }
                >
                  {normalizeNumber(product.quantity ?? product.productStock)}
                </Chip>
              </TableCell>
              <TableCell>
                <Chip
                  className={
                    productStatus === "out"
                      ? "bg-rose-100 text-rose-800 border border-rose-200 text-xs"
                      : productStatus === "low"
                        ? "bg-amber-100 text-amber-800 border border-amber-200 text-xs"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs"
                  }
                >
                  {t(`status.${productStatus}`)}
                </Chip>
              </TableCell>
              <TableCell className={canManageProducts ? "py-2 px-3" : "hidden"}>
                <div className="flex justify-end gap-2">
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
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
