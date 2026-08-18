"use client";

import { useEffect, useMemo, useState } from "react";

import { Accordion, AccordionItem, Button, Card, CardBody, CardFooter, CardHeader, Chip, Image } from "@heroui/react";
import { ChevronUp, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { getProductStockQuantity, getProductStockStatus, getStockChipClassName, isStockTracked, PRODUCT_STOCK_STATUS } from "@/components/pages/Store/utils/productStockStatus";
import { ProductDetailsModal } from "@/components/shared/ProductDetailsModal";
import { ViewButton } from "@/components/shared/ViewButton";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";

import { VariantSelectorModal } from "./VariantSelectorModal";

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
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variantProduct, setVariantProduct] = useState(null);
  const columnCount = useColumnCount();
  const productColumns = useMemo(() => {
    const columnGroups = Array.from({ length: columnCount }, () => []);
    products.forEach((product, productIndex) => columnGroups[productIndex % columnCount].push(product));
    return columnGroups;
  }, [products, columnCount]);

  const getCategoryNames = (categoryIds) => {
    const selectedCategoryIds = categoryIds ?? [];
    return categories
      .filter((category) => selectedCategoryIds.includes(category.id))
      .map((category) => category.name)
      .join(", ");
  };

  const handleShowProductDetails = (product) => {
    setShowProductDetails(true);
    setSelectedProduct(product);
  };

  const handleAddClick = (product) => {
    if (product.hasVariants && !product.isBundle) {
      setVariantProduct(product);
    } else {
      onAddProduct(product);
    }
  };

  return (
    <>
      <div className="flex gap-3 md:gap-4 w-full">
        {productColumns.map((productColumn, columnIndex) => (
          <div key={columnIndex} className="flex flex-col gap-3 md:gap-4 flex-1 min-w-0">
            {productColumn.map((product) => {
              const { id, description, priceCents, name, imageUrl, SKU, categoryIds } = product;
              const stockQuantity = getProductStockQuantity(product);
              const stockStatus = getProductStockStatus(product);
              const tracksStock = isStockTracked(product);
              const productImageUrl = storedAssetUrl(imageUrl);
              const categoryNames = getCategoryNames(categoryIds);
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
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <CardHeader className="flex flex-row items-start justify-between pb-1">
                    <div className="flex flex-col flex-1 min-w-0">
                      <h2 className="text-sm md:text-lg font-medium [overflow-wrap:anywhere]">{name}</h2>
                      <p className="text-xs">{categoryNames || cardProductTranslation("card.noCategory")}</p>
                    </div>
                    <div className="hidden sm:flex flex-wrap justify-end gap-1 shrink-0 ml-2">
                      {product.isBundle && (
                        <Chip size="sm" className="bg-blue-100 text-blue-700 border border-blue-200">
                          {cardProductTranslation("card.bundle")}
                        </Chip>
                      )}
                      {product.hasVariants && !product.isBundle && (
                        <Chip size="sm" className="bg-blue-100 text-blue-700 border border-blue-200">
                          {cardProductTranslation("card.hasVariants")}
                        </Chip>
                      )}
                    </div>
                  </CardHeader>
                  <CardBody className="py-1">
                    <h2 className="text-lg md:text-2xl font-bold text-green-800">
                      {product.hasVariants && product.maxPriceCents !== priceCents ? (
                        <span className="flex flex-wrap gap-x-1">
                          <span>{formatAmount(priceCents)} -</span>
                          <span>{formatAmount(product.maxPriceCents)}</span>
                        </span>
                      ) : formatAmount(priceCents)}
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
                  <CardFooter className="flex flex-col pt-0 items-stretch gap-2 md:gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {product.isBundle && (
                        <Chip size="sm" className="sm:hidden bg-blue-100 text-blue-700 border border-blue-200">
                          {cardProductTranslation("card.bundle")}
                        </Chip>
                      )}
                      {product.hasVariants && !product.isBundle && (
                        <Chip size="sm" className="sm:hidden bg-blue-100 text-blue-700 border border-blue-200">
                          {cardProductTranslation("card.hasVariants")}
                        </Chip>
                      )}
                      {tracksStock && (
                        <Chip
                          size="sm"
                          className={getStockChipClassName(stockStatus)}
                        >
                          {stockQuantity} {cardProductTranslation("card.stock")}
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
                        isDisabled={!product.hasVariants && stockStatus === PRODUCT_STOCK_STATUS.OUT}
                        onPress={() => handleAddClick(product)}
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
      <VariantSelectorModal
        product={variantProduct}
        isOpen={!!variantProduct}
        onClose={() => setVariantProduct(null)}
        onAddToCart={(product, variant) => {
          onAddProduct(product, variant);
          setVariantProduct(null);
        }}
      />
    </>
  );
}
