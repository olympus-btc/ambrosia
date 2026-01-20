import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { EditProductsModal } from "../EditProductsModal";

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
  productCategory: "cat-1",
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
      setData={jest.fn()}
      onChange={jest.fn()}
      updateProduct={jest.fn()}
      onProductUpdated={jest.fn()}
      categories={categories}
      categoriesLoading={false}
      createCategory={jest.fn()}
      editProductsShowModal
      setEditProductsShowModal={jest.fn()}
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

    const removeButton = document.querySelector("button.bg-red-400");
    expect(removeButton).not.toBeNull();
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
    const onChange = jest.fn();
    renderModal({ onChange, categories: [], categoriesLoading: true, data: { ...baseData, productCategory: "" } });

    const select = screen.getAllByLabelText("modal.productCategoryLabel")[0];
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith({ productCategory: "" });
  });

  it("closes modal via onOpenChange", () => {
    const setEditProductsShowModal = jest.fn();
    const setData = jest.fn();
    renderModal({ setEditProductsShowModal, setData });

    fireEvent.click(screen.getByText("modal.cancelButton"));
    expect(setEditProductsShowModal).toHaveBeenCalledWith(false);
    expect(setData).toHaveBeenCalledWith({
      productId: "",
      productName: "",
      productDescription: "",
      productCategory: "",
      productSKU: "",
      productPrice: "",
      productStock: "",
      productMinStock: "",
      productMaxStock: "",
      productImage: null,
      productImageUrl: "",
      productImageRemoved: false,
    });
  });

  it("does not create category when input is empty and prevents duplicate while loading", async () => {
    const createCategory = jest.fn(() => new Promise(() => { }));
    const onChange = jest.fn();
    renderModal({ createCategory, onChange });

    const addButton = screen.getByText("modal.createCategoryButton");
    fireEvent.click(addButton);
    expect(createCategory).not.toHaveBeenCalled();

    const input = screen.getByLabelText("modal.createCategoryLabel");
    fireEvent.change(input, { target: { value: "New Cat" } });

    fireEvent.click(addButton);
    fireEvent.click(addButton);
    await waitFor(() => expect(createCategory).toHaveBeenCalledTimes(1));
  });

  it("does not update category when createCategory returns falsy", async () => {
    const createCategory = jest.fn(() => Promise.resolve(undefined));
    const onChange = jest.fn();
    renderModal({ createCategory, onChange });

    const input = screen.getByLabelText("modal.createCategoryLabel");
    fireEvent.change(input, { target: { value: "New Cat" } });
    fireEvent.click(screen.getByText("modal.createCategoryButton"));

    await waitFor(() => expect(createCategory).toHaveBeenCalledWith("New Cat"));
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("closes and resets data on cancel", () => {
    const setData = jest.fn();
    const setEditProductsShowModal = jest.fn();

    renderModal({ setData, setEditProductsShowModal });

    fireEvent.click(screen.getByText("modal.cancelButton"));

    expect(setData).toHaveBeenCalledWith({
      productId: "",
      productName: "",
      productDescription: "",
      productCategory: "",
      productSKU: "",
      productPrice: "",
      productStock: "",
      productMinStock: "",
      productMaxStock: "",
      productImage: null,
      productImageUrl: "",
      productImageRemoved: false,
    });
    expect(setEditProductsShowModal).toHaveBeenCalledWith(false);
  });

  it("saves changes and closes on submit", async () => {
    const setEditProductsShowModal = jest.fn();
    const updateProduct = jest.fn(() => Promise.resolve());
    const onProductUpdated = jest.fn();

    renderModal({ setEditProductsShowModal, updateProduct, onProductUpdated });

    fireEvent.click(screen.getByText("modal.editButton"));

    await waitFor(() => expect(updateProduct).toHaveBeenCalledWith(baseData));
    expect(setEditProductsShowModal).toHaveBeenCalledWith(false);
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
