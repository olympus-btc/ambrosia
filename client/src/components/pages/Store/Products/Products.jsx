"use client";
import { useState } from "react";

import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";
import { StoreLayout } from "../StoreLayout";

import { AddProductsModal } from "./AddProductsModal";
import { DeleteProductsModal } from "./DeleteProductsModal";
import { EditProductsModal } from "./EditProductsModal";
import { ProductsTable } from "./ProductsTable";

export function Products() {
  const [addProductsShowModal, setAddProductsShowModal] = useState(false);
  const [editProductsShowModal, setEditProductsShowModal] = useState(false);
  const [deleteProductsShowModal, setDeleteProductsShowModal] = useState(false);
  const [data, setData] = useState({
    productId: "",
    productName: "",
    productDescription: "",
    productCategory: "",
    productSKU: "",
    productPrice: "",
    productStock: "",
    productMinStock: 0,
    productMaxStock: 0,
    productImage: null,
    productImageUrl: "",
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const { products, addProduct, updateProduct, deleteProduct, isUploading, refetch: refetchProducts } = useProducts();
  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    refetch: refetchCategories,
  } = useCategories("product");

  const handleDataChange = (newData) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);

    setData({
      productId: product.id,
      productName: product.name,
      productDescription: product.description,
      productCategory: product.category_id,
      productSKU: product.SKU,
      productPrice: product.price_cents ? product.price_cents / 100 : "",
      productStock: product.quantity,
      productMinStock: product.min_stock_threshold ?? 0,
      productMaxStock: product.max_stock_threshold ?? 0,
      productImage: null,
      productImageUrl: product.image_url,
    });

    setEditProductsShowModal(true);
  };

  const handleDeleteProduct = (product) => {
    setProductToDelete(product);
    setDeleteProductsShowModal(true);
  };

  const handleRefreshData = async () => {
    await Promise.all([refetchProducts(), refetchCategories()]);
  };

  const t = useTranslations("products");

  return (
    <StoreLayout>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-semibold text-green-900">{t("title")}</h1>
          <p className="text-gray-800 mt-4">
            {t("subtitle")}
          </p>
        </div>
        <Button
          color="primary"
          className="bg-green-800"
          onPress={() => setAddProductsShowModal(true)}
        >
          {t("addProduct")}
        </Button>
      </header>
      <div className="bg-white rounded-lg shadow-lg p-4 lg:p-8 overflow-x-auto">
        <ProductsTable
          products={products}
          categories={categories}
          onEditProduct={handleEditProduct}
          onDeleteProduct={handleDeleteProduct}
        />
      </div>

      <AddProductsModal
        addProductsShowModal={addProductsShowModal}
        setAddProductsShowModal={setAddProductsShowModal}
        data={data}
        setData={setData}
        addProduct={addProduct}
        isUploading={isUploading}
        categories={categories}
        categoriesLoading={categoriesLoading}
        createCategory={createCategory}
        onChange={handleDataChange}
        onProductCreated={handleRefreshData}
      />

      <EditProductsModal
        data={data}
        setData={setData}
        product={selectedProduct}
        onChange={handleDataChange}
        updateProduct={updateProduct}
        isUploading={isUploading}
        onProductUpdated={handleRefreshData}
        categories={categories}
        categoriesLoading={categoriesLoading}
        createCategory={createCategory}
        editProductsShowModal={editProductsShowModal}
        setEditProductsShowModal={setEditProductsShowModal}
      />

      <DeleteProductsModal
        product={productToDelete}
        deleteProductsShowModal={deleteProductsShowModal}
        setDeleteProductsShowModal={setDeleteProductsShowModal}
        onConfirm={() => {
          setDeleteProductsShowModal(false);
          deleteProduct(productToDelete);
        }}
      />
    </StoreLayout>
  );
}
