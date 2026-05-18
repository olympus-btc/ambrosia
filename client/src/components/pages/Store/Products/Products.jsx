"use client";
import { useState } from "react";

import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { toArray } from "@/components/utils/array";
import { RequirePermission } from "@/hooks/usePermission";
import { PageHeader } from "@components/shared/PageHeader";

import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";

import { AddProductsModal } from "./AddProductsModal";
import { Categories } from "./Categories";
import { DeleteProductsModal } from "./DeleteProductsModal";
import { EditProductsModal } from "./EditProductsModal";
import { ProductsList } from "./ProductsList";

function createEmptyProductForm() {
  return {
    productId: "",
    productName: "",
    productDescription: "",
    productCategories: [],
    productSKU: "",
    productPrice: "",
    productStock: 1,
    productMinStock: 0,
    productMaxStock: 0,
    productImage: null,
    productImageUrl: "",
    productImageRemoved: false,
  };
}

export function Products() {
  const [addProductsShowModal, setAddProductsShowModal] = useState(false);
  const [editProductsShowModal, setEditProductsShowModal] = useState(false);
  const [deleteProductsShowModal, setDeleteProductsShowModal] = useState(false);
  const [productForm, setProductForm] = useState(createEmptyProductForm);
  const [productToDelete, setProductToDelete] = useState(null);
  const { products, addProduct, updateProduct, deleteProduct, isUploading, refetch: refetchProducts } = useProducts();
  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: refetchCategories,
  } = useCategories("product");

  const handleProductFormChange = (newData) => {
    setProductForm((prev) => ({ ...prev, ...newData }));
  };

  const resetProductForm = () => {
    setProductForm(createEmptyProductForm());
  };

  const handleCloseAddProductsModal = () => {
    resetProductForm();
    setAddProductsShowModal(false);
  };

  const handleCloseEditProductsModal = () => {
    resetProductForm();
    setEditProductsShowModal(false);
  };

  const handleEditProduct = (product) => {
    setProductForm({
      productId: product.id,
      productName: product.name,
      productDescription: product.description,
      productCategories: toArray(product.categoryIds),
      productSKU: product.SKU,
      productPrice: product.priceCents ? product.priceCents / 100 : "",
      productStock: product.quantity,
      productMinStock: product.minStockThreshold ?? 0,
      productMaxStock: product.maxStockThreshold ?? 0,
      productImage: null,
      productImageUrl: product.imageUrl,
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
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={(
          <RequirePermission allOf={["products_create"]}>
            <Button
              color="primary"
              className="bg-green-800"
              onPress={() => {
                resetProductForm();
                setAddProductsShowModal(true);
              }}
            >
              {t("addProduct")}
            </Button>
          </RequirePermission>
        )}
      />
      <div className="bg-white rounded-lg shadow-lg p-4 lg:p-8 overflow-x-auto">
        <ProductsList
          products={products}
          categories={categories}
          onEditProduct={handleEditProduct}
          onDeleteProduct={handleDeleteProduct}
        />
      </div>

      <AddProductsModal
        addProductsShowModal={addProductsShowModal}
        onClose={handleCloseAddProductsModal}
        data={productForm}
        addProduct={addProduct}
        isUploading={isUploading}
        categories={categories}
        categoriesLoading={categoriesLoading}
        createCategory={createCategory}
        onChange={handleProductFormChange}
        onProductCreated={handleRefreshData}
      />

      <EditProductsModal
        data={productForm}
        onChange={handleProductFormChange}
        updateProduct={updateProduct}
        isUploading={isUploading}
        onProductUpdated={handleRefreshData}
        categories={categories}
        categoriesLoading={categoriesLoading}
        createCategory={createCategory}
        editProductsShowModal={editProductsShowModal}
        onClose={handleCloseEditProductsModal}
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

      <Categories
        categories={categories}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
        refreshData={handleRefreshData}
      />
    </>
  );
}
