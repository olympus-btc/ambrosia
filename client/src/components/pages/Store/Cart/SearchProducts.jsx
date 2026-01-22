import { useState } from "react";

import { Input, Button } from "@heroui/react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { ProductList } from "./ProductList";

export function SearchProducts({ products, onAddProduct, categories }) {
  const t = useTranslations("cart");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(null);

  const filteredProducts = products.filter((product) => {
    const categoryObject = categories.find((cat) => cat.id === product.category_id);
    const categoryName = categoryObject ? categoryObject.name : "";

    const searchMatch = product.name.toLowerCase().includes(search.toLowerCase())
      || product.SKU.toLowerCase().includes(search.toLowerCase())
      || categoryName.toLowerCase().includes(search.toLowerCase());
    const categoryMatch = !categoryFilter || product.category_id === categoryFilter;
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
        label={t("search.label")}
        placeholder={t("search.placeholder")}
        startContent={
          <Search width={20} height={20} />
        }
        value={search}
        onClear={() => setSearch("")}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          color="primary"
          radius="full"
          size="sm"
          onPress={() => setCategoryFilter(null)}
        >
          {t("search.filterAll")}
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            onPress={() => setCategoryFilter(category.id)}
            className="bg-slate-100"
            radius="full"
            size="sm"
          >
            {category.name}
          </Button>
        ))

        }
      </div>
      <ProductList products={filteredProducts} categories={categories} onAddProduct={onAddProduct} />
    </div>
  );
};
