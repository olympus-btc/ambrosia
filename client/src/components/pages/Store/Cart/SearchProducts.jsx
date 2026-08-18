import { useState } from "react";

import { Input, Button } from "@heroui/react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { ProductList } from "./ProductList";

export function SearchProducts({ products, onAddProduct, categories }) {
  const cartTranslations = useTranslations("cart");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(null);

  const filteredProducts = products.filter((product) => {
    const categoryIds = product.categoryIds ?? [];
    const categoryNames = categories
      .filter((category) => categoryIds.includes(category.id))
      .map((category) => category.name)
      .join(" ");

    const searchMatch = product.name.toLowerCase().includes(search.toLowerCase())
      || product.SKU?.toLowerCase().includes(search.toLowerCase())
      || categoryNames.toLowerCase().includes(search.toLowerCase());
    const categoryMatch = !categoryFilter || categoryIds.includes(categoryFilter);
    return searchMatch && categoryMatch;
  });

  return (
    <div className="flex flex-col">
      <Input
        isClearable
        className="mb-4"
        classNames={{
          inputWrapper: "rounded-lg bg-white data-[hover=true]:bg-white data-[focus=true]:bg-white",
        }}
        label={cartTranslations("search.label")}
        placeholder={cartTranslations("search.placeholder")}
        startContent={
          <Search width={20} height={20} />
        }
        value={search}
        onClear={() => setSearch("")}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          color={categoryFilter === null ? "primary" : undefined}
          className={categoryFilter === null ? "" : "bg-slate-100"}
          radius="full"
          size="sm"
          aria-pressed={categoryFilter === null}
          onPress={() => setCategoryFilter(null)}
        >
          {cartTranslations("search.filterAll")}
        </Button>
        {categories.map((category) => {
          const isSelectedCategory = categoryFilter === category.id;

          return (
            <Button
              key={category.id}
              color={isSelectedCategory ? "primary" : undefined}
              className={isSelectedCategory ? "" : "bg-slate-100"}
              radius="full"
              size="sm"
              aria-pressed={isSelectedCategory}
              onPress={() => setCategoryFilter(category.id)}
            >
              {category.name}
            </Button>
          );
        })

        }
      </div>
      <ProductList products={filteredProducts} categories={categories} onAddProduct={onAddProduct} />
    </div>
  );
};
