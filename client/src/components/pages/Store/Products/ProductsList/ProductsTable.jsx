"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Image,
} from "@heroui/react";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { ViewButton } from "@/components/shared/ViewButton";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";
import { RequirePermission } from "@/hooks/usePermission";

export function ProductsTable({ products, categoryNameById, status, normalizeNumber, formatAmount, canManageProducts, onEditProduct, onDeleteProduct, onViewProduct }) {
  const productsTranslation = useTranslations("products");

  return (
    <Table className="min-w-[700px]" removeWrapper aria-label={productsTranslation("tableAriaLabel")}>
      <TableHeader>
        <TableColumn className="py-2 px-3 w-20">{productsTranslation("image")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[50px]">{productsTranslation("name")}</TableColumn>
        <TableColumn className="py-2 px-3 w-20">{productsTranslation("type")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[50px]">{productsTranslation("description")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[100px]">{productsTranslation("category")}</TableColumn>
        <TableColumn className="py-2 px-3 w-20">{productsTranslation("sku")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[70px]">{productsTranslation("price")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[60px]">{productsTranslation("stock")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[90px]">{productsTranslation("stockStatus")}</TableColumn>
        <TableColumn className="py-2 px-3 w-40 text-right">{productsTranslation("actions")}</TableColumn>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const productStatus = status(product);
          const imageUrl = storedAssetUrl(product?.imageUrl);
          return (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden bg-gray-100">
                  {imageUrl ? (
                    <Image
                      removeWrapper
                      alt={product.name}
                      className="h-full w-full object-cover"
                      src={imageUrl}
                    />
                  ) : (
                    <div data-testid={`product-table-image-placeholder-${product.id}`}>
                      <ImageIcon aria-hidden="true" className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="block max-w-[120px] truncate">{product.name}</span>
              </TableCell>
              <TableCell>
                {product.isBundle ? (
                  <Chip className="bg-blue-100 text-xs text-blue-800 border border-blue-200">
                    {productsTranslation("bundle")}
                  </Chip>
                ) : (
                  <Chip className="bg-green-200 text-xs text-green-800 border border-green-300">
                    {productsTranslation("regular")}
                  </Chip>
                )}
              </TableCell>
              <TableCell>
                <span className="block max-w-[50px] truncate">{product.description}</span>
              </TableCell>
              <TableCell>
                {product.categoryIds?.some((catId) => categoryNameById[String(catId)]) ? (
                  <div className="flex flex-wrap gap-1">
                    {product.categoryIds.filter((catId) => categoryNameById[String(catId)]).map((catId) => (
                      <Chip key={catId} className="bg-green-200 text-xs text-green-800 border border-green-300">
                        {categoryNameById[String(catId)]}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <Chip className="bg-gray-200 text-xs text-gray-500 border border-gray-300">
                    {productsTranslation("noCategory")}
                  </Chip>
                )}
              </TableCell>
              <TableCell>
                <span className="whitespace-nowrap">{product.SKU}</span>
              </TableCell>
              <TableCell>
                <span className="whitespace-nowrap">{formatAmount(product.priceCents)}</span>
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
                        : "bg-green-200 text-xs text-green-800 border border-green-300"
                  }
                >
                  {productsTranslation(`status.${productStatus}`)}
                </Chip>
              </TableCell>
              <TableCell className="py-2 px-3">
                <div className="flex justify-end gap-2">
                  <ViewButton onPress={() => onViewProduct(product)}>{productsTranslation("viewDetails")}</ViewButton>
                  {canManageProducts && (
                    <>
                      <RequirePermission allOf={["products_update"]}>
                        <EditButton onPress={() => onEditProduct(product)}>{productsTranslation("edit")}</EditButton>
                      </RequirePermission>
                      <RequirePermission allOf={["products_delete"]}>
                        <DeleteButton onPress={() => onDeleteProduct(product)}>{productsTranslation("delete")}</DeleteButton>
                      </RequirePermission>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
