import { Button, Card, CardBody, CardFooter, CardHeader, Chip, Image } from "@heroui/react";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";

export function ProductList({ products, onAddProduct, categories }) {
  const t = useTranslations("cart");
  const { formatAmount } = useCurrency();
  const defaultMaxStock = 11;

  const getCategoryNames = (categoryIds) => {
    const ids = categoryIds ?? [];
    const names = categories
      .filter((cat) => ids.includes(cat.id))
      .map((cat) => cat.name);
    return names.length > 0 ? names.join(", ") : t("card.errors.unknownCategory");
  };

  const normalizeNumber = (value, fallback = 0) => {
    const numeric = Number(value ?? fallback);
    return Number.isFinite(numeric) ? numeric : fallback;
  };

  const stockStatus = (product) => {
    const max = defaultMaxStock;
    const quantity = normalizeNumber(product.quantity);

    if (quantity <= 0) {
      return "out";
    }
    if (quantity < max) {
      return "low";
    }
    return "ok";
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
      {products.map((product) => {
        const status = stockStatus(product);
        const imageUrl = storedAssetUrl(product.imageUrl);
        return (
          <Card
            shadow="none"
            className="bg-white rounded-lg"
            key={product.id}
          >
            <div className="h-28 md:h-36 bg-gray-100 overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <Image
                  removeWrapper
                  alt={product.name}
                  src={imageUrl}
                  className="w-full h-full object-cover rounded-none"
                />
              ) : (
                <div data-testid={`product-image-placeholder-${product.id}`}>
                  <ImageIcon aria-hidden="true" className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            <CardHeader className="flex flex-col items-start pb-1">
              <h2 className="text-sm md:text-lg font-medium">{product.name}</h2>
              <p className="text-xs">{getCategoryNames(product.categoryIds)}</p>
            </CardHeader>
            <CardBody className="py-1">
              <h2 className="text-lg md:text-2xl font-bold text-green-800">
                {formatAmount(product.priceCents)}
              </h2>
              <p className="hidden md:block text-xs">
                SKU: <span className="text-gray-800">{product.SKU}</span>
              </p>
            </CardBody>
            <CardFooter className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-center sm:justify-between">
              <Chip
                size="sm"
                className={
                  status === "out"
                    ? "bg-rose-100 text-rose-800 border border-rose-200 text-xs"
                    : status === "low"
                      ? "bg-amber-100 text-amber-800 border border-amber-200 text-xs"
                      : "bg-green-200 text-xs text-green-800 border border-green-300"
                }
              >
                {normalizeNumber(product.quantity)} {t("card.stock")}
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
