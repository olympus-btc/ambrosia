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

import { useCurrency } from "@/components/hooks/useCurrency";
import { getProductStockQuantity, getProductStockStatus, getStockChipClassName, isStockTracked } from "@/components/pages/Store/utils/productStockStatus";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { VariantsButton } from "@/components/shared/VariantsButton";
import { ViewButton } from "@/components/shared/ViewButton";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";
import { RequirePermission } from "@/hooks/usePermission";

import { getProductCategories } from "./utils/productCategories";

export function ProductsTable({
  products,
  categoryNameById,
  canManageProducts,
  onEditProduct,
  onDeleteProduct,
  onViewProduct,
  onManageVariants,
}) {
  const productsTranslation = useTranslations("products");
  const { formatAmount } = useCurrency();

  return (
    <Table className="min-w-[760px]" removeWrapper aria-label={productsTranslation("tableAriaLabel")}>
      <TableHeader>
        <TableColumn className="py-2 px-3 w-20">{productsTranslation("image")}</TableColumn>
        <TableColumn className="py-2 px-3 w-[50px]">{productsTranslation("name")}</TableColumn>
        <TableColumn className="py-2 px-3 w-24">{productsTranslation("type")}</TableColumn>
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
          const imageUrl = storedAssetUrl(product?.imageUrl);
          const productCategories = getProductCategories(product, categoryNameById);
          const stockStatus = getProductStockStatus(product);
          const stockChipClassName = getStockChipClassName(stockStatus);
          const stockQuantityLabel = isStockTracked(product) ? getProductStockQuantity(product) : "N/A";
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
                      <ImageIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="block max-w-[120px] truncate">{product.name}</span>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {product.isBundle && (
                    <Chip className="bg-blue-100 text-xs text-blue-800 border border-blue-200">
                      {productsTranslation("bundle")}
                    </Chip>
                  )}
                  {!product.isBundle && (
                    <Chip className="bg-green-200 text-xs text-green-800 border border-green-300">
                      {productsTranslation("regular")}
                    </Chip>
                  )}
                  {product.hasVariants && !product.isBundle && (
                    <Chip className="bg-blue-100 text-xs text-blue-800 border border-blue-200">
                      {productsTranslation("variants")}
                    </Chip>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="block max-w-[50px] truncate">{product.description}</span>
              </TableCell>
              <TableCell>
                {productCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {productCategories.map((category) => (
                      <Chip key={category.id} className="bg-green-200 text-xs text-green-800 border border-green-300">
                        {category.name}
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
                <Chip className={stockChipClassName}>
                  {stockQuantityLabel}
                </Chip>
              </TableCell>
              <TableCell>
                <Chip className={stockChipClassName}>
                  {productsTranslation(`status.${stockStatus}`)}
                </Chip>
              </TableCell>
              <TableCell className="py-2 px-3">
                <div className="flex justify-end gap-2">
                  {canManageProducts && product.hasVariants && !product.isBundle && (
                    <RequirePermission allOf={["products_update"]}>
                      <VariantsButton onPress={() => onManageVariants(product)}>
                        {productsTranslation("manageVariants")}
                      </VariantsButton>
                    </RequirePermission>
                  )}

                  <ViewButton onPress={() => onViewProduct(product)}>
                    {productsTranslation("viewDetails")}
                  </ViewButton>

                  {canManageProducts && (
                    <>
                      <RequirePermission allOf={["products_update"]}>
                        <EditButton onPress={() => onEditProduct(product)}>
                          {productsTranslation("edit")}
                        </EditButton>
                      </RequirePermission>
                      <RequirePermission allOf={["products_delete"]}>
                        <DeleteButton onPress={() => onDeleteProduct(product)}>
                          {productsTranslation("delete")}
                        </DeleteButton>
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
