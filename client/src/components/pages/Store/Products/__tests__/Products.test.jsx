import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

import * as useNavigationHook from "@/hooks/useNavigation";
import { I18nProvider } from "@/i18n/I18nProvider";
import * as configurationsProvider from "@/providers/configurations/configurationsProvider";

const mockAddProduct = jest.fn(() => Promise.resolve());
const mockUpdateProduct = jest.fn(() => Promise.resolve());
const mockDeleteProduct = jest.fn(() => Promise.resolve(true));
const mockRefetchProducts = jest.fn(() => Promise.resolve());
const mockRefetchCategories = jest.fn(() => Promise.resolve());
const mockCreateCategory = jest.fn(() => Promise.resolve("cat-3"));
let mockProductsForbidden = false;

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return { ...actual, addToast: jest.fn() };
});

jest.mock("@/components/utils/storedAssetUrl", () => ({
  __esModule: true,
  storedAssetUrl: (url) => url,
}));

jest.mock("@/hooks/usePermission");

jest.mock("../AddProductsModal", () => ({
  AddProductsModal: ({ addProductsShowModal, productForm, onChange, onProductCreated, addProduct, onClose }) => (
    addProductsShowModal ? (
      <div>
        modal.titleAdd
        <label>
          <span>modal.productNameLabel</span>
          <input
            aria-label="modal.productNameLabel"
            value={productForm?.productName || ""}
            onChange={(productNameChangeEvent) => onChange?.({ productName: productNameChangeEvent.target.value })}
          />
        </label>
        <button onClick={() => { addProduct?.({}); onProductCreated?.(); }}>modal.submitButton</button>
        <button onClick={() => onClose?.()}>modal.cancelButton</button>
      </div>
    ) : null
  ),
}));

jest.mock("../EditProductsModal", () => ({
  EditProductsModal: ({ editProductsShowModal, productForm, onChange, onProductUpdated, updateProduct, onClose }) => (
    editProductsShowModal ? (
      <div>
        modal.titleEdit
        <input
          aria-label="modal.productNameLabel"
          value={productForm?.productName || ""}
          onChange={(productNameChangeEvent) => onChange?.({ productName: productNameChangeEvent.target.value })}
        />
        <input
          aria-label="modal.productDescriptionLabel"
          value={productForm?.productDescription || ""}
          onChange={(productDescriptionChangeEvent) => onChange?.({ productDescription: productDescriptionChangeEvent.target.value })}
        />
        <button onClick={() => { updateProduct?.(productForm); onProductUpdated?.(); }}>modal.editButton</button>
        <button onClick={() => onClose?.()}>modal.cancelButton</button>
      </div>
    ) : null
  ),
}));

jest.mock("../../hooks/useProducts", () => ({
  useProducts: () => ({
    products: [
      { id: 1, name: "Jade Wallet", description: "Hardware Wallet", categoryId: "cat-1", SKU: "jade-wallet", priceCents: 1600, quantity: 10, imageUrl: "/images/jade.png" },
      { id: 2, name: "Jade Plus", description: "Hardware Wallet Plus", categoryId: "cat-1", SKU: "jade-plus", priceCents: 4000, quantity: 5, imageUrl: "/images/jade-plus.png" },
    ],
    forbidden: mockProductsForbidden,
    addProduct: mockAddProduct,
    updateProduct: mockUpdateProduct,
    deleteProduct: mockDeleteProduct,
    refetch: mockRefetchProducts,
    isUploading: false,
  }),
}));

jest.mock("../../hooks/useCategories", () => ({
  useCategories: () => ({
    categories: [
      { id: "cat-1", name: "Category 1" },
    ],
    loading: false,
    createCategory: mockCreateCategory,
    updateCategory: jest.fn(() => Promise.resolve()),
    deleteCategory: jest.fn(() => Promise.resolve()),
    refetch: mockRefetchCategories,
  }),
}));

import { Products } from "../Products";

const { addToast } = require("@heroui/react");

function renderProducts() {
  return render(
    <I18nProvider>
      <Products />
    </I18nProvider>,
  );
}

const originalWarn = console.warn;

const defaultNavigation = [
  {
    path: "/store/products",
    label: "products",
    icon: "products",
    showInNavbar: true,
  },
];
const mockLogout = jest.fn();
const mockConfig = {
  businessName: "Mi Tienda Test",
  businessType: "store",
};

beforeEach(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("aria-label")
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  jest.clearAllMocks();
  mockProductsForbidden = false;

  jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
    availableFeatures: {},
    availableNavigation: defaultNavigation,

    isAuth: true,
    isAdmin: false,
    isLoading: false,
    user: { userName: "testuser" },
    logout: mockLogout,
  });

  jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
    config: mockConfig,
    isLoading: false,
    businessType: "store",
    refreshConfig: jest.fn(),
    setConfig: jest.fn(),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Products page", () => {
  it("merges product form changes correctly", async () => {
    await act(async () => {
      renderProducts();
    });

    const editButtons = screen.getAllByText("edit").map((editTextElement) => editTextElement.closest("button"));
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    const nameInput = screen.getByDisplayValue("Jade Wallet");
    fireEvent.change(nameInput, { target: { value: "Updated Name" } });

    expect(screen.getByDisplayValue("Updated Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hardware Wallet")).toBeInTheDocument();
  });

  it("shows the permission-blocked message instead of the list when forbidden", async () => {
    mockProductsForbidden = true;

    await act(async () => {
      renderProducts();
    });

    expect(screen.getByText("permissionBlocked.title")).toBeInTheDocument();
    expect(screen.queryByText("Jade Wallet")).not.toBeInTheDocument();
  });

  it("renders the table and header", async () => {
    await act(async () => {
      renderProducts();
    });
    expect(screen.getByRole("heading", { level: 1, name: "title" })).toBeInTheDocument();
    expect(screen.getByText("addProduct")).toBeInTheDocument();
    expect(screen.getAllByText("Jade Wallet").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jade Plus").length).toBeGreaterThan(0);
  });

  it("opens AddProductsModal when clicking Add Product", async () => {
    await act(async () => {
      renderProducts();
    });
    const btn = screen.getByText("addProduct");
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(screen.getByText("modal.titleAdd")).toBeInTheDocument();
  });

  it("resets add form data when add modal is closed and reopened", async () => {
    await act(async () => {
      renderProducts();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("addProduct"));
    });

    fireEvent.change(screen.getByLabelText("modal.productNameLabel"), { target: { value: "Dirty Add Name" } });
    expect(screen.getByDisplayValue("Dirty Add Name")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("modal.cancelButton"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("addProduct"));
    });

    expect(screen.getByLabelText("modal.productNameLabel")).toHaveValue("");
  });

  it("opens EditProductsModal with correct product data", async () => {
    await act(async () => {
      renderProducts();
    });

    const editButtons = screen.getAllByText("edit").map((editTextElement) => editTextElement.closest("button"));

    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    expect(screen.getByText("modal.titleEdit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jade Wallet")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hardware Wallet")).toBeInTheDocument();
  });

  it("resets edit form data when edit modal is closed and reopened", async () => {
    await act(async () => {
      renderProducts();
    });

    const editButtons = screen.getAllByText("edit").map((editTextElement) => editTextElement.closest("button"));

    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    fireEvent.change(screen.getByLabelText("modal.productNameLabel"), { target: { value: "Dirty Edit Name" } });
    expect(screen.getByDisplayValue("Dirty Edit Name")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("modal.cancelButton"));
    });

    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    expect(screen.getByDisplayValue("Jade Wallet")).toBeInTheDocument();
  });

  it("opens DeleteProductsModal", async () => {
    await act(async () => {
      renderProducts();
    });

    const deleteButtons = screen.getAllByText("delete").map((deleteTextElement) => deleteTextElement.closest("button"));

    await act(async () => {
      fireEvent.click(deleteButtons[1]);
    });

    expect(screen.getByText("modal.titleDelete")).toBeInTheDocument();
  });

  it("does not open delete modal when product is null", async () => {
    await act(async () => {
      renderProducts();
    });

    expect(screen.getAllByText("Jade Wallet").length).toBeGreaterThan(0);
    expect(screen.queryByText("modal.titleDelete")).not.toBeInTheDocument();
  });

  it("confirms delete product from modal", async () => {
    await act(async () => {
      renderProducts();
    });

    const deleteButtons = screen.getAllByText("delete").map((deleteTextElement) => deleteTextElement.closest("button"));
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("modal.deleteButton"));
    });

    expect(mockDeleteProduct).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(addToast).toHaveBeenCalledWith({
      description: "toasts.deleteSuccess",
      color: "success",
    });
    expect(screen.queryByText("modal.titleDelete")).not.toBeInTheDocument();
  });

  it("keeps delete modal open when product delete fails", async () => {
    mockDeleteProduct.mockResolvedValueOnce(false);

    await act(async () => {
      renderProducts();
    });

    const deleteButtons = screen.getAllByText("delete").map((deleteTextElement) => deleteTextElement.closest("button"));
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("modal.deleteButton"));
    });

    expect(mockDeleteProduct).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(addToast).not.toHaveBeenCalledWith({
      description: "toasts.deleteSuccess",
      color: "success",
    });
    expect(screen.getByText("modal.titleDelete")).toBeInTheDocument();
  });

  it("refreshes data after add and edit actions", async () => {
    await act(async () => {
      renderProducts();
    });

    const addBtn = screen.getByText("addProduct");
    await act(async () => {
      fireEvent.click(addBtn);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("modal.submitButton"));
    });

    await waitFor(() => expect(mockAddProduct).toHaveBeenCalled());
    await waitFor(() => expect(mockRefetchProducts).toHaveBeenCalled());
    expect(mockRefetchCategories).toHaveBeenCalled();

    const editButtons = screen.getAllByText("edit").map((editTextElement) => editTextElement.closest("button"));
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("modal.editButton"));
    });

    await waitFor(() => expect(mockUpdateProduct).toHaveBeenCalled());
    expect(mockRefetchProducts).toHaveBeenCalledTimes(2);
    expect(mockRefetchCategories).toHaveBeenCalledTimes(2);
  });
});
