import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";
import * as configurationsProvider from "@/providers/configurations/configurationsProvider";

import { AddProductsModal } from "../AddProductsModal";

jest.mock("../CategorySelector", () => ({
  CategorySelector: () => (
    <div aria-label="modal.productCategoryLabel">
      category-selector
    </div>
  ),
}));

jest.mock("../BundleProductSelector", () => ({
  BundleProductSelector: () => <div data-testid="bundle-product-selector" />,
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const NumberInput = ({
    label,
    onValueChange,
    value = "",
    isRequired,
    errorMessage,
    startContent,
    minValue,
    maxValue,
    classNames,
    ...props
  }) => (
    <input
      aria-label={label}
      type="number"
      value={value}
      onChange={(numberInputChangeEvent) => {
        const parsed = Number(numberInputChangeEvent.target.value);
        const clamped = Number.isNaN(parsed) ? "" : Math.max(0, parsed);
        onValueChange?.(clamped);
      }}
      {...props}
    />
  );

  const switchTestId = (children, ariaLabel) => {
    if (children === "modal.isBundle") return "bundle-switch";
    if (ariaLabel === "trackStock") return "track-stock-switch";
    return "variants-switch";
  };

  const Switch = ({ children, isSelected, onValueChange, "aria-label": ariaLabel }) => (
    <label>
      <input
        data-testid={switchTestId(children, ariaLabel)}
        type="checkbox"
        checked={isSelected ?? false}
        onChange={(switchChangeEvent) => onValueChange?.(switchChangeEvent.target.checked)}
      />
      {children}
    </label>
  );

  return { ...actual, addToast: jest.fn(), NumberInput, Switch };
});

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: { acronym: "$" },
  }),
}));

jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
  config: { priceStep: 0.01 },
});

const categories = [
  { id: "cat-1", name: "Category 1" },
];

const { addToast } = require("@heroui/react");

const baseProductForm = {
  productName: "Jade Wallet",
  productDescription: "Hardware wallet",
  productCategories: ["cat-1"],
  productSKU: "jade-wallet",
  productPrice: 10,
  productStock: 5,
  productImage: "",
};

const mockFileReader = (fileReaderResult = "data:image/png;base64,test") => {
  const originalFileReader = global.FileReader;
  global.FileReader = jest.fn(() => ({
    readAsDataURL() {
      this.result = fileReaderResult;
      this.onloadend?.({ target: { result: fileReaderResult } });
    },
  }));
  return () => {
    global.FileReader = originalFileReader;
  };
};

const renderModal = (props = {}) => render(
  <I18nProvider>
    <AddProductsModal
      productForm={baseProductForm}
      addProduct={jest.fn()}
      onChange={jest.fn()}
      onProductCreated={jest.fn()}
      categories={categories}
      categoriesLoading={false}
      createCategory={jest.fn()}
      addProductsShowModal
      onClose={jest.fn()}
      {...props}
    />
  </I18nProvider>,
);

describe("AddProductsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders form fields and labels", () => {
    renderModal();

    expect(screen.getByText("modal.titleAdd")).toBeInTheDocument();
    expect(screen.getByLabelText("modal.productNameLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("modal.productDescriptionLabel")).toBeInTheDocument();
    expect(screen.getByText("modal.productImageUpload")).toBeInTheDocument();
  });

  it("updates text fields with string values", () => {
    const onChange = jest.fn();
    renderModal({ onChange });

    fireEvent.change(screen.getByLabelText("modal.productNameLabel"), { target: { value: "Nuevo producto" } });
    expect(onChange).toHaveBeenLastCalledWith({ productName: "Nuevo producto" });

    fireEvent.change(screen.getByLabelText("modal.productDescriptionLabel"), { target: { value: "Descripcion" } });
    expect(onChange).toHaveBeenLastCalledWith({ productDescription: "Descripcion" });

    fireEvent.change(screen.getByLabelText("modal.productSKULabel"), { target: { value: "sku-123" } });
    expect(onChange).toHaveBeenLastCalledWith({ productSKU: "sku-123" });
  });

  it("enforces non-negative numeric values for price and stock", () => {
    const onChange = jest.fn();
    renderModal({ onChange });

    fireEvent.change(screen.getByLabelText("modal.productPriceLabel"), { target: { value: "-5" } });
    const latestPriceUpdate = onChange.mock.calls.at(-1)[0];
    expect(typeof latestPriceUpdate.productPrice).toBe("number");
    expect(latestPriceUpdate.productPrice).toBeGreaterThanOrEqual(0);

    fireEvent.change(screen.getByLabelText("modal.productStockLabel"), { target: { value: "-3" } });
    const latestStockUpdate = onChange.mock.calls.at(-1)[0];
    expect(typeof latestStockUpdate.productStock).toBe("number");
    expect(latestStockUpdate.productStock).toBeGreaterThanOrEqual(0);
  });

  it("passes the configured price step down to the price field", () => {
    configurationsProvider.useConfigurations.mockReturnValueOnce({ config: { priceStep: 0.5 } });
    renderModal();

    expect(screen.getByLabelText("modal.productPriceLabel")).toHaveAttribute("step", "0.5");
  });

  it("defaults the price step to 0.01 when config has not loaded yet", () => {
    configurationsProvider.useConfigurations.mockReturnValueOnce({ config: null });
    renderModal();

    expect(screen.getByLabelText("modal.productPriceLabel")).toHaveAttribute("step", "0.01");
  });

  it("warns with the actual price when it is not a multiple of the configured price step", () => {
    configurationsProvider.useConfigurations.mockReturnValueOnce({ config: { priceStep: 0.1 } });
    renderModal({ productForm: { ...baseProductForm, productPrice: 0.25 } });

    expect(screen.getByText(/priceStepMismatchWarning/)).toHaveTextContent("$ 0.25");
  });

  it("does not warn when the product price matches the configured price step", () => {
    configurationsProvider.useConfigurations.mockReturnValueOnce({ config: { priceStep: 0.1 } });
    renderModal({ productForm: { ...baseProductForm, productPrice: 0.3 } });

    expect(screen.queryByText(/priceStepMismatchWarning/)).not.toBeInTheDocument();
  });

  it("handles image upload and removal", async () => {
    const onChange = jest.fn();
    const restoreFileReader = mockFileReader();
    renderModal({ onChange });
    const fileInput = document.querySelector("input[type=\"file\"]");
    const file = new File(["content"], "photo.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith({ productImage: file });
    expect(await screen.findByAltText("Image preview")).toBeInTheDocument();

    const removeButton = screen.getByTestId("remove-image-button");
    fireEvent.click(removeButton);

    const latestImageUpdate = onChange.mock.calls.at(-1)?.[0];
    expect(latestImageUpdate).toEqual({ productImage: null });
    expect(screen.queryByAltText("Image preview")).not.toBeInTheDocument();
    restoreFileReader();
  });

  it("ignores image change when no file is provided", () => {
    const onChange = jest.fn();
    renderModal({ onChange });
    const fileInput = document.querySelector("input[type=\"file\"]");
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders upload button when no image preview", () => {
    renderModal();
    expect(screen.getByText("modal.productImageUpload")).toBeInTheDocument();
  });

  it("handles category select with empty value and loading", () => {
    renderModal({
      categories: [],
      categoriesLoading: true,
      productForm: { ...baseProductForm, productCategories: [] },
    });

    const select = screen.getAllByLabelText("modal.productCategoryLabel")[0];
    expect(select).toBeInTheDocument();
  });

  it("cancels and closes modal", () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("modal.cancelButton"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders the category selector", () => {
    renderModal();

    expect(screen.getByLabelText("modal.productCategoryLabel")).toBeInTheDocument();
  });

  it("does not submit when uploading", () => {
    const addProduct = jest.fn();
    renderModal({ addProduct, isUploading: true });

    fireEvent.click(screen.getByText("modal.submitButton"));
    expect(addProduct).not.toHaveBeenCalled();
  });

  it("prevents double submit while submitting", () => {
    const addProduct = jest.fn(() => new Promise(() => { }));
    renderModal({ addProduct, isUploading: false });

    fireEvent.click(screen.getByText("modal.submitButton"));
    fireEvent.click(screen.getByText("modal.submitButton"));
    expect(addProduct).toHaveBeenCalledTimes(1);
  });

  it("renders the bundle toggle", () => {
    renderModal();

    expect(screen.getByText("modal.isBundle")).toBeInTheDocument();
  });

  it("hides stock field when product is a bundle", () => {
    renderModal({ productForm: { ...baseProductForm, isBundle: true } });

    expect(screen.queryByLabelText("modal.productStockLabel")).not.toBeInTheDocument();
  });

  it("shows BundleComponentSelector when product is a bundle", () => {
    renderModal({ productForm: { ...baseProductForm, isBundle: true } });

    expect(screen.getByTestId("bundle-product-selector")).toBeInTheDocument();
  });

  it("calls onChange with bundle fields when bundle toggle is switched on", () => {
    const onChange = jest.fn();
    renderModal({ onChange });

    fireEvent.click(screen.getByTestId("bundle-switch"));

    expect(onChange).toHaveBeenCalledWith({
      isBundle: true,
      hasVariants: false,
      bundleComponents: [],
      trackStock: true,
      productStock: 0,
      productMinStock: 0,
      productMaxStock: 0,
    });
  });

  it("hides the stock tracking toggle when product is a bundle", () => {
    renderModal({ productForm: { ...baseProductForm, isBundle: true } });

    expect(screen.queryByTestId("track-stock-switch")).not.toBeInTheDocument();
  });

  it("renders the stock tracking toggle enabled by default", () => {
    renderModal();

    expect(screen.getByTestId("track-stock-switch")).toBeChecked();
    expect(screen.getByLabelText("modal.productStockLabel")).toBeInTheDocument();
  });

  it("hides stock field when stock tracking is disabled", () => {
    renderModal({ productForm: { ...baseProductForm, trackStock: false } });

    expect(screen.queryByLabelText("modal.productStockLabel")).not.toBeInTheDocument();
  });

  it("resets the stock fields when stock tracking is switched off", () => {
    const onChange = jest.fn();
    renderModal({
      onChange,
      productForm: { ...baseProductForm, productMinStock: 2, productMaxStock: 40 },
    });

    fireEvent.click(screen.getByTestId("track-stock-switch"));

    expect(onChange).toHaveBeenCalledWith({
      trackStock: false,
      productStock: 0,
      productMinStock: 0,
      productMaxStock: 0,
    });
  });

  it("submits form, calls addProduct and closes", async () => {
    const addProduct = jest.fn(() => Promise.resolve());
    const onClose = jest.fn();
    const onProductCreated = jest.fn();

    renderModal({
      addProduct,
      onClose,
      onProductCreated,
    });

    fireEvent.click(screen.getByText("modal.submitButton"));

    await waitFor(() => expect(addProduct).toHaveBeenCalledWith(baseProductForm));
    expect(addToast).toHaveBeenCalledWith({
      description: "toasts.createSuccess",
      color: "success",
    });
    expect(onClose).toHaveBeenCalled();
    expect(onProductCreated).toHaveBeenCalled();
  });
});
