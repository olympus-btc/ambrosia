"use client";
import { useMemo } from "react";

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

import { useCurrency } from "@/components/hooks/useCurrency";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";

export function ProductsTable({ products, categories = [], onEditProduct, onDeleteProduct }) {
  const t = useTranslations("products");
  const { formatAmount } = useCurrency();
  const categoryNameById = useMemo(() => categories.reduce((map, category) => {
    const categoryId = String(category.id);
    map[categoryId] = category.name;
    return map;
  }, {})
  , [categories]);

  return (
    <section className="w-full overflow-x-auto">
      <Table className="min-w-[700px]" removeWrapper>
        <TableHeader>
          <TableColumn className="py-2 px-3 w-20">{t("image")}</TableColumn>
          <TableColumn className="py-2 px-3 w-[50px]">{t("name")}</TableColumn>
          <TableColumn className="py-2 px-3 w-[50px]">{t("description")}</TableColumn>
          <TableColumn className="py-2 px-3 w-[100px]">{t("category")}</TableColumn>
          <TableColumn className="py-2 px-3 w-20">{t("sku")}</TableColumn>
          <TableColumn className="py-2 px-3 w-[70px]">{t("price")}</TableColumn>
          <TableColumn className="py-2 px-3 w-[60px]">{t("stock")}</TableColumn>
          <TableColumn className="py-2 px-3 w-[100px] text-right">{t("actions")}</TableColumn>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.sku}>
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
                <Chip
                  className="bg-green-200 text-xs text-green-800 border border-green-300"
                >
                  {categoryNameById[String(product.category_id)] ?? product.category_id}
                </Chip>
              </TableCell>
              <TableCell>
                <span className="whitespace-nowrap">{product.SKU}</span>
              </TableCell>
              <TableCell>
                <span className="whitespace-nowrap">{formatAmount(product.price_cents)}</span>
              </TableCell>
              <TableCell>
                <Chip
                  className="bg-green-200 text-xs text-green-800 border border-green-300"
                >
                  {product.quantity}
                </Chip>
              </TableCell>
              <TableCell className="py-2 px-3">
                <div className="flex justify-end gap-2">
                  <Button
                    aria-label="Edit Product"
                    isIconOnly
                    size="sm"
                    className="text-xs text-white bg-blue-500"
                    onPress={() => onEditProduct(product)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
