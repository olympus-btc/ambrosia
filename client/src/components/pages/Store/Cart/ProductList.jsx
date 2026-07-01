"use client";

import { useEffect, useMemo, useState } from "react";

import { Accordion, AccordionItem, Button, Card, CardBody, CardFooter, CardHeader, Chip, Image } from "@heroui/react";
import { ChevronUp, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { ProductDetailsModal } from "@/components/shared/ProductDetailsModal";
import { ViewButton } from "@/components/shared/ViewButton";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";

const XL_BREAKPOINT_PX = 1280;
const XL_COLUMN_COUNT = 3;
const DEFAULT_COLUMN_COUNT = 2;

function useColumnCount() {
  const [columnCount, setColumnCount] = useState(DEFAULT_COLUMN_COUNT);
  useEffect(() => {
    const syncColumnCount = () => setColumnCount(window.innerWidth >= XL_BREAKPOINT_PX ? XL_COLUMN_COUNT : DEFAULT_COLUMN_COUNT);
    syncColumnCount();
    window.addEventListener("resize", syncColumnCount);
    return () => window.removeEventListener("resize", syncColumnCount);
  }, []);
  return columnCount;
}

export function ProductList({ products, onAddProduct, categories }) {
  const cardProductTranslation = useTranslations("cart");
  const { formatAmount } = useCurrency();
  const defaultMaxStock = 11;
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const columnCount = useColumnCount();
  const productColumns = useMemo(() => {
    const columnGroups = Array.from({ length: columnCount }, () => []);
    products.forEach((product, productIndex) => columnGroups[productIndex % columnCount].push(product));
    return columnGroups;
  }, [products, columnCount]);

  const getCategoryNames = (categoryIds) => {
    const ids = categoryIds ?? [];
    const names = categories
      .filter((cat) => ids.includes(cat.id))
      .map((cat) => cat.name);
    return names.length > 0 ? names.join(", ") : cardProductTranslation("card.errors.unknownCategory");
  };

  const normalizeNumber = (value, fallback = 0) => {
    const numeric = Number(value ?? fallback);
    return Number.isFinite(numeric) ? numeric : fallback;
  };

  const stockStatus = (product) => {
    const quantity = normalizeNumber(product.quantity);
    if (quantity <= 0) return "out";
    if (quantity < defaultMaxStock) return "low";
    return "ok";
  };

  const handleShowProductDetails = (product) => {
    setShowProductDetails(true);
    setSelectedProduct(product);
  };

  return (
    <>
      <div className="flex gap-3 md:gap-4 w-full">
        {productColumns.map((productColumn, columnIndex) => (
          <div key={columnIndex} className="flex flex-col gap-3 md:gap-4 flex-1 min-w-0">
            {productColumn.map((product) => {
              const status = stockStatus(product);
              const { id, description, priceCents, name, imageUrl, SKU, categoryIds, quantity } = product;
              const productImageUrl = storedAssetUrl(imageUrl);
              return (
                <Card shadow="none" className="bg-white rounded-lg w-full" key={id}>
                  <div className="h-28 md:h-36 bg-gray-100 overflow-hidden flex items-center justify-center">
                    {productImageUrl ? (
                      <Image
                        removeWrapper
                        alt={name}
                        src={productImageUrl}
                        className="w-full h-full object-cover rounded-none"
                      />
                    ) : (
                      <div data-testid={`product-image-placeholder-${id}`}>
                        <ImageIcon aria-hidden="true" className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <CardHeader className="flex flex-col items-start pb-1">
                    <h2 className="text-sm md:text-lg font-medium">{name}</h2>
                    <p className="text-xs">{getCategoryNames(categoryIds)}</p>
                  </CardHeader>
                  <CardBody className="py-1">
                    <h2 className="text-lg md:text-2xl font-bold text-green-800">
                      {formatAmount(priceCents)}
                    </h2>
                    <p className="hidden md:block text-xs">
                      SKU: <span className="text-gray-800">{SKU}</span>
                    </p>
                    {description && (
                      <Accordion isCompact className="hidden md:block px-0 m-0 w-full">
                        <AccordionItem
                          key={id}
                          indicator={<ChevronUp className="text-primary h-4 w-4" />}
                          classNames={{
                            trigger: "px-0 rounded-lg",
                            content: "px-0",
                            indicator: [
                              "rotate-0",
                              "data-[open=true]:rotate-180",
                              "transition-transform",
                              "duration-200",
                            ].join(" "),
                            title: "text-xs",
                          }}
                          aria-label={`${cardProductTranslation("card.showProductDescription")} ${product.name}`}
                          title={cardProductTranslation("card.showProductDescription")}
                          className="text-gray-400 text-justify text-xs"
                        >
                          {description}
                        </AccordionItem>
                      </Accordion>
                    )}
                  </CardBody>
                  <CardFooter className="flex flex-col pt-0 items-stretch gap-2 md:gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-col gap-1 shrink-0">
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
                        {normalizeNumber(quantity)} {cardProductTranslation("card.stock")}
                      </Chip>
                      {product.isBundle && (
                        <Chip size="sm" className="bg-blue-100 text-xs text-blue-800 border border-blue-200">
                          {cardProductTranslation("card.bundle")}
                        </Chip>
                      )}
                    </div>
                    <div className="flex justify-between sm:flex-1">
                      <div className="md:hidden">
                        <ViewButton onPress={() => handleShowProductDetails(product)} />
                      </div>
                      <Button
                        className="w-full ml-3"
                        color="primary"
                        size="sm"
                        isDisabled={quantity === 0}
                        onPress={() => onAddProduct(product)}
                      >
                        {cardProductTranslation("card.add")}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
      <ProductDetailsModal
        isOpen={showProductDetails}
        onClose={() => setShowProductDetails(false)}
        showAddButton={false}
        product={selectedProduct}
        categories={categories}
      />
    </>
  );
}
