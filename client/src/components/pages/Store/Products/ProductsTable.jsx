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
  const defaultMinStock = 5;
  const defaultMaxStock = 11;
  const categoryNameById = useMemo(() => categories.reduce((map, category) => {
    const categoryId = String(category.id);
    map[categoryId] = category.name;
    return map;
  }, {})
  , [categories]);
  const normalizeNumber = (value, fallback = 0) => {
    const numeric = Number(value ?? fallback);
    return Number.isFinite(numeric) ? numeric : fallback;
  };
  const normalizeThreshold = (value, fallback) => {
    const numeric = normalizeNumber(value, fallback);
    return numeric > 0 ? numeric : fallback;
  };
  const stockStatus = (product) => {
    const min = normalizeThreshold(
      product.min_stock_threshold ?? product.productMinStock,
      defaultMinStock,
    );
    const max = normalizeThreshold(
      product.max_stock_threshold ?? product.productMaxStock,
      defaultMaxStock,
    );
    const quantity = normalizeNumber(
      product.quantity ?? product.productStock,
    );

    if (quantity <= min) {
      return "out";
    }
    if (quantity < max) {
      return "low";
    }
    return "ok";
  };

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
          <TableColumn className="py-2 px-3 w-[90px]">{t("stockStatus")}</TableColumn>
          <TableColumn className="py-2 px-3 w-[100px] text-right">{t("actions")}</TableColumn>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const status = stockStatus(product);
            return (
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
                    className={
                      status === "out"
                        ? "bg-rose-100 text-rose-800 border border-rose-200 text-xs"
                        : status === "low"
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
                      status === "out"
                        ? "bg-rose-100 text-rose-800 border border-rose-200 text-xs"
                        : status === "low"
                          ? "bg-amber-100 text-amber-800 border border-amber-200 text-xs"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs"
                    }
                  >
                    {t(`status.${status}`)}
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
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
