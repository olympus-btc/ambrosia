import { Button, Card, CardBody, CardFooter, CardHeader, Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

export function ProductList({ products, onAddProduct, categories }) {
  const t = useTranslations("cart");
  const { formatAmount } = useCurrency();

  const getCategoryName = (categoryId) => {
    const category = categories.find((category) => category.id === categoryId);
    return category ? category.name : t("card.errors.unknownCategory");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {products.map((product) => (
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
              color="secondary"
              size="sm"
            >
              {product.quantity} {t("card.stock")}
            </Chip>
            <Button
              color="primary"
              size="sm"
              onPress={() => onAddProduct(product)}
            >
              {t("card.add")}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
