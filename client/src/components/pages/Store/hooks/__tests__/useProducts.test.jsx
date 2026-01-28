import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { useUpload } from "@/components/hooks/useUpload";
import { apiClient } from "@/services/apiClient";

import { useProducts } from "../useProducts";

jest.mock("@/services/apiClient", () => ({
  apiClient: jest.fn(),
}));

jest.mock("@/components/hooks/useUpload", () => ({
  useUpload: jest.fn(),
}));

const handlers = {};

function TestComponent() {
  const {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    isUploading,
  } = useProducts();

  useEffect(() => {
    handlers.addProduct = addProduct;
    handlers.updateProduct = updateProduct;
    handlers.deleteProduct = deleteProduct;
  }, [addProduct, updateProduct, deleteProduct]);

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{products.length}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
      <span data-testid="uploading">{isUploading ? "yes" : "no"}</span>
    </div>
  );
}

describe("useProducts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads products on mount", async () => {
    useUpload.mockReturnValue({ upload: jest.fn(), isUploading: false });
    apiClient.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("error")).toHaveTextContent("no");
  });

  it("sets empty products when apiClient returns non-array", async () => {
    useUpload.mockReturnValue({ upload: jest.fn(), isUploading: false });
    apiClient.mockResolvedValueOnce({ data: [] });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("sets error when fetching products fails", async () => {
    useUpload.mockReturnValue({ upload: jest.fn(), isUploading: false });
    apiClient.mockRejectedValueOnce(new Error("fetch-fail"));

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
  });

  it("adds a product and uploads a file when provided", async () => {
    const upload = jest.fn().mockResolvedValue([{ url: "https://img.test/item.png" }]);
    useUpload.mockReturnValue({ upload, isUploading: false });

    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce({ ok: true });
    apiClient.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));

    const imageFile = new File(["img"], "item.png", { type: "image/png" });

    await act(async () => {
      await handlers.addProduct({
        productSKU: "SKU-1",
        productName: "Cafe",
        productDescription: "Caliente",
        productImage: imageFile,
        productImageUrl: null,
        productPrice: 10.5,
        productCategory: 7,
        productStock: 3,
        productMinStock: 0,
        productMaxStock: 0,
      });
    });

    expect(upload).toHaveBeenCalledWith([imageFile]);
    expect(apiClient).toHaveBeenCalledWith("/products", {
      method: "POST",
      body: {
        SKU: "SKU-1",
        name: "Cafe",
        description: "Caliente",
        image_url: "https://img.test/item.png",
        cost_cents: 1050,
        category_id: 7,
        quantity: 3,
        min_stock_threshold: 0,
        max_stock_threshold: 0,
        price_cents: 1050,
      },
      notShowError: false,
    });
  });

  it("updates a product without uploading when no file is provided", async () => {
    const upload = jest.fn();
    useUpload.mockReturnValue({ upload, isUploading: false });

    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce({ ok: true });
    apiClient.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));

    await act(async () => {
      await handlers.updateProduct({
        productId: 22,
        productSKU: "SKU-22",
        productName: "Te",
        productDescription: "",
        productImage: null,
        productImageUrl: "https://cdn.test/te.png",
        productPrice: "4.25",
        productCategory: 2,
        productStock: 1,
        productMinStock: 0,
        productMaxStock: 0,
      });
    });

    expect(upload).not.toHaveBeenCalled();
    expect(apiClient).toHaveBeenCalledWith("/products/22", {
      method: "PUT",
      body: {
        id: 22,
        SKU: "SKU-22",
        name: "Te",
        description: null,
        image_url: "https://cdn.test/te.png",
        cost_cents: 425,
        category_id: 2,
        quantity: 1,
        min_stock_threshold: 0,
        max_stock_threshold: 0,
        price_cents: 425,
      },
      notShowError: false,
    });
  });

  it("uploads a file when updating a product with a new image", async () => {
    const upload = jest.fn().mockResolvedValue([{ path: "/files/tea.png" }]);
    useUpload.mockReturnValue({ upload, isUploading: false });

    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce({ ok: true });
    apiClient.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));

    const imageFile = new File(["img"], "tea.png", { type: "image/png" });

    await act(async () => {
      await handlers.updateProduct({
        productId: 30,
        productSKU: "SKU-30",
        productName: "Te Verde",
        productDescription: "Suave",
        productImage: imageFile,
        productImageUrl: null,
        productPrice: 3.5,
        productCategory: 4,
        productStock: 8,
        productMinStock: 0,
        productMaxStock: 0,
      });
    });

    expect(upload).toHaveBeenCalledWith([imageFile]);
    expect(apiClient).toHaveBeenCalledWith("/products/30", {
      method: "PUT",
      body: {
        id: 30,
        SKU: "SKU-30",
        name: "Te Verde",
        description: "Suave",
        image_url: "/files/tea.png",
        cost_cents: 350,
        category_id: 4,
        quantity: 8,
        min_stock_threshold: 0,
        max_stock_threshold: 0,
        price_cents: 350,
      },
      notShowError: false,
    });
  });

  it("deletes a product and refetches", async () => {
    useUpload.mockReturnValue({ upload: jest.fn(), isUploading: false });

    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce({ ok: true });
    apiClient.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));

    await act(async () => {
      await handlers.deleteProduct({ id: 44 });
    });

    expect(apiClient).toHaveBeenCalledWith("/products/44", {
      method: "DELETE",
      notShowError: false,
    });
  });
});
