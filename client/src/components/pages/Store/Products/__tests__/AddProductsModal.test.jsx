import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { AddProductsModal } from "../AddProductsModal";

jest.mock("../CategorySelector", () => ({
  CategorySelector: () => (
    <div aria-label="modal.productCategoryLabel">
      category-selector
    </div>
  ),
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
    ...props
  }) => (
    <input
      aria-label={label}
      type="number"
      value={value}
      onChange={(e) => {
        const parsed = Number(e.target.value);
        const clamped = Number.isNaN(parsed) ? "" : Math.max(0, parsed);
        onValueChange?.(clamped);
      }}
      {...props}
    />
  );

  return { ...actual, NumberInput };
});

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: { acronym: "$" },
  }),
}));

const categories = [
  { id: "cat-1", name: "Category 1" },
];

const baseData = {
  productName: "Jade Wallet",
  productDescription: "Hardware wallet",
  productCategories: ["cat-1"],
  productSKU: "jade-wallet",
  productPrice: 10,
  productStock: 5,
  productImage: "",
};

const mockFileReader = (result = "data:image/png;base64,test") => {
  const original = global.FileReader;
  global.FileReader = jest.fn(() => ({
    readAsDataURL() {
      this.result = result;
      this.onloadend?.({ target: { result } });
    },
  }));
  return () => {
    global.FileReader = original;
  };
};

const renderModal = (props = {}) => render(
  <I18nProvider>
    <AddProductsModal
      data={baseData}
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
    const priceCall = onChange.mock.calls.at(-1)[0];
    expect(typeof priceCall.productPrice).toBe("number");
    expect(priceCall.productPrice).toBeGreaterThanOrEqual(0);

    fireEvent.change(screen.getByLabelText("modal.productStockLabel"), { target: { value: "-3" } });
    const stockCall = onChange.mock.calls.at(-1)[0];
    expect(typeof stockCall.productStock).toBe("number");
    expect(stockCall.productStock).toBeGreaterThanOrEqual(0);
  });

  it("handles image upload and removal", async () => {
    const onChange = jest.fn();
    const restore = mockFileReader();
    renderModal({ onChange });
    const fileInput = document.querySelector("input[type=\"file\"]");
    const file = new File(["content"], "photo.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith({ productImage: file });
    expect(await screen.findByAltText("Image preview")).toBeInTheDocument();

    const removeButton = screen.getByTestId("remove-image-button");
    fireEvent.click(removeButton);

    const lastCall = onChange.mock.calls.at(-1)?.[0];
    expect(lastCall).toEqual({ productImage: null });
    expect(screen.queryByAltText("Image preview")).not.toBeInTheDocument();
    restore();
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
    renderModal({ categories: [], categoriesLoading: true, data: { ...baseData, productCategories: [] } });

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

    await waitFor(() => expect(addProduct).toHaveBeenCalledWith(baseData));
    expect(onClose).toHaveBeenCalled();
    expect(onProductCreated).toHaveBeenCalled();
  });
});
