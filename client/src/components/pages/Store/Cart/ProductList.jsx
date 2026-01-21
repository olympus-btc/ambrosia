import { Button, Card, CardBody, CardFooter, CardHeader, Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

export function ProductList({ products, onAddProduct, categories }) {
  const t = useTranslations("cart");
  const { formatAmount } = useCurrency();
  const lowStockBuffer = 1.5;

  const getCategoryName = (categoryId) => {
    const category = categories.find((category) => category.id === categoryId);
    return category ? category.name : t("card.errors.unknownCategory");
  };

  const normalizeNumber = (value, fallback = 0) => {
    const numeric = Number(value ?? fallback);
    return Number.isFinite(numeric) ? numeric : fallback;
  };

  const stockStatus = (product) => {
    const min = normalizeNumber(product.min_stock_threshold);
    const max = normalizeNumber(product.max_stock_threshold);
    const quantity = normalizeNumber(product.quantity);

    if (quantity <= 0) {
      return "out";
    }
    if (max > 0 && quantity >= max) {
      return "over";
    }
    if (min > 0 && quantity <= min * lowStockBuffer) {
      return "low";
    }
    return "ok";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {products.map((product) => {
        const status = stockStatus(product);
        return (
          <Card
            shadow="none"
            className="bg-white rounded-lg"
            key={product.id}
          >
            <CardHeader className="flex flex-col items-start">
              <h2 className="text-lg">{product.name}</h2>
              <p className="text-xs">{getCategoryName(product.category_id)}</p>
            </CardHeader>
            <CardBody>
              <h2 className="text-2xl font-bold text-green-800">
                {formatAmount(product.price_cents)}
              </h2>
              <p className="text-xs">
                SKU: <span className="text-gray-800">{product.SKU}</span>
              </p>
            </CardBody>
            <CardFooter className="flex justify-between">
              <Chip
                size="sm"
                className={
                  status === "out"
                    ? "bg-zinc-200 text-zinc-700 border border-zinc-300 text-xs"
                    : status === "low"
                      ? "bg-amber-100 text-amber-800 border border-amber-200 text-xs"
                      : status === "over"
                        ? "bg-rose-100 text-rose-800 border border-rose-200 text-xs"
                        : "bg-green-200 text-xs text-green-800 border border-green-300"
                }
              >
                {product.quantity} {t("card.stock")}
              </Chip>
              <Button
                color="primary"
                size="sm"
                isDisabled={product.quantity == 0 ? true : false}
                onPress={() => onAddProduct(product)}
              >
                {t("card.add")}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
