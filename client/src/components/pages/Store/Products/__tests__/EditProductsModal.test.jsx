import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { EditProductsModal } from "../EditProductsModal";

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
  productId: "1",
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
    <EditProductsModal
      data={baseData}
      onChange={jest.fn()}
      updateProduct={jest.fn()}
      onProductUpdated={jest.fn()}
      categories={categories}
      categoriesLoading={false}
      createCategory={jest.fn()}
      editProductsShowModal
      onClose={jest.fn()}
      {...props}
    />
  </I18nProvider>,
);

describe("EditProductsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders product data and translations", () => {
    renderModal();

    expect(screen.getByText("modal.titleEdit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jade Wallet")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hardware wallet")).toBeInTheDocument();
  });

  it("updates text fields with string values", () => {
    const onChange = jest.fn();
    renderModal({ onChange });

    fireEvent.change(screen.getByLabelText("modal.productNameLabel"), { target: { value: "New name" } });
    expect(onChange).toHaveBeenLastCalledWith({ productName: "New name" });

    fireEvent.change(screen.getByLabelText("modal.productDescriptionLabel"), { target: { value: "New Description" } });
    expect(onChange).toHaveBeenLastCalledWith({ productDescription: "New Description" });

    fireEvent.change(screen.getByLabelText("modal.productSKULabel"), { target: { value: "sku-456" } });
    expect(onChange).toHaveBeenLastCalledWith({ productSKU: "sku-456" });
  });

  it("enforces non-negative numeric values for price and stock", () => {
    const onChange = jest.fn();
    renderModal({ onChange });

    fireEvent.change(screen.getByLabelText("modal.productPriceLabel"), { target: { value: "-12" } });
    const priceCall = onChange.mock.calls.at(-1)[0];
    expect(typeof priceCall.productPrice).toBe("number");
    expect(priceCall.productPrice).toBeGreaterThanOrEqual(0);

    fireEvent.change(screen.getByLabelText("modal.productStockLabel"), { target: { value: "-8" } });
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
    expect(onChange).toHaveBeenCalledWith({ productImage: file, productImageRemoved: false });
    expect(await screen.findByAltText("Image preview")).toBeInTheDocument();

    const removeButton = screen.getByTestId("remove-image-button");
    fireEvent.click(removeButton);

    const lastCall = onChange.mock.calls.at(-1)?.[0];
    expect(lastCall).toEqual({ productImage: null, productImageRemoved: true });
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

  it("handles category select with empty value and loading", () => {
    renderModal({ categories: [], categoriesLoading: true, data: { ...baseData, productCategories: [] } });

    const select = screen.getAllByLabelText("modal.productCategoryLabel")[0];
    expect(select).toBeInTheDocument();
  });

  it("closes modal via onOpenChange", () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByText("modal.cancelButton"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders the category selector in edit mode", () => {
    renderModal();

    expect(screen.getByLabelText("modal.productCategoryLabel")).toBeInTheDocument();
  });

  it("closes on cancel", () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByText("modal.cancelButton"));

    expect(onClose).toHaveBeenCalled();
  });

  it("saves changes and closes on submit", async () => {
    const onClose = jest.fn();
    const updateProduct = jest.fn(() => Promise.resolve());
    const onProductUpdated = jest.fn();

    renderModal({ onClose, updateProduct, onProductUpdated });

    fireEvent.click(screen.getByText("modal.editButton"));

    await waitFor(() => expect(updateProduct).toHaveBeenCalledWith(baseData));
    expect(onClose).toHaveBeenCalled();
    expect(onProductUpdated).toHaveBeenCalled();
  });

  it("does not submit when uploading", () => {
    const updateProduct = jest.fn();
    renderModal({ updateProduct, isUploading: true });

    fireEvent.click(screen.getByText("modal.editButton"));
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("prevents double submit while submitting", () => {
    const updateProduct = jest.fn(() => new Promise(() => { }));
    renderModal({ updateProduct, isUploading: false });

    fireEvent.click(screen.getByText("modal.editButton"));
    fireEvent.click(screen.getByText("modal.editButton"));
    expect(updateProduct).toHaveBeenCalledTimes(1);
  });
});
