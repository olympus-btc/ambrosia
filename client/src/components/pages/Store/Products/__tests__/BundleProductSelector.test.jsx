import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { BundleProductSelector } from "../BundleProductSelector";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@heroui/react", () => ({
  Input: ({ label, placeholder, value, onChange }) => (
    <input
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  ),
  NumberInput: require("@/test-utils/numberInputMock").NumberInputMock,
  Select: ({ "aria-label": ariaLabel, children, selectedKeys = [], onSelectionChange }) => (
    <select
      aria-label={ariaLabel}
      value={[...selectedKeys][0] ?? ""}
      onChange={(selectChangeEvent) => onSelectionChange?.(new Set([selectChangeEvent.target.value]))}
    >
      {children}
    </select>
  ),
  SelectItem: ({ children, value, ...props }) => (
    <option value={value ?? props.key}>{children}</option>
  ),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatAmount: (cents) => `$${(cents / 100).toFixed(2)}`,
  }),
}));

const mockFetchProductDetail = jest.fn();

jest.mock("@/components/pages/Store/hooks/useProductVariants", () => ({
  useProductVariants: () => ({
    fetchProductDetail: mockFetchProductDetail,
  }),
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress }) => (
    <button type="button" onClick={onPress}>
      delete
    </button>
  ),
}));

const productA = { id: "prod-a", name: "Arduino Nano", SKU: "ARD-NANO", priceCents: 1500, costCents: 500, isBundle: false };
const productB = { id: "prod-b", name: "Breadboard", SKU: "BB-400", priceCents: 900, costCents: 300, isBundle: false };
const variantProduct = { id: "prod-variant", name: "T-Shirt", SKU: "TSHIRT", priceCents: 1200, costCents: 0, hasVariants: true, isBundle: false };
const bundleProduct = { id: "prod-bundle", name: "Starter Kit", SKU: "KIT-1", priceCents: 3000, costCents: 1000, isBundle: true };

const variantProductDetail = {
  variants: [
    { id: "variant-red", optionValueIds: ["red"], costCents: null, priceCents: 1200, quantity: 4, isActive: true },
    { id: "variant-blue", optionValueIds: ["blue"], costCents: null, priceCents: 1400, quantity: 3, isActive: true },
    { id: "variant-inactive", optionValueIds: ["inactive"], costCents: null, priceCents: 100, quantity: 3, isActive: false },
  ],
  options: [
    {
      id: "color",
      values: [
        { id: "red", value: "Red" },
        { id: "blue", value: "Blue" },
        { id: "inactive", value: "Inactive" },
      ],
    },
  ],
};

const allProducts = [productA, productB, variantProduct, bundleProduct];

function renderSelector(props = {}) {
  return render(
    <BundleProductSelector
      selectedProducts={[]}
      allProducts={allProducts}
      onComponentsChange={jest.fn()}
      {...props}
    />,
  );
}

describe("BundleProductSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchProductDetail.mockResolvedValue(variantProductDetail);
  });

  it("shows empty state when no products are selected", () => {
    renderSelector();

    expect(screen.getByText("modal.bundleComponentsEmpty")).toBeInTheDocument();
  });

  it("renders the search input", () => {
    renderSelector();

    expect(screen.getByLabelText("modal.bundleComponentsLabel")).toBeInTheDocument();
  });

  it("shows matching products when typing in the search input", () => {
    renderSelector();

    fireEvent.change(screen.getByLabelText("modal.bundleComponentsLabel"), {
      target: { value: "Arduino" },
    });

    expect(screen.getByText("Arduino Nano")).toBeInTheDocument();
    expect(screen.queryByText("Breadboard")).not.toBeInTheDocument();
  });

  it("filters by SKU as well as name", () => {
    renderSelector();

    fireEvent.change(screen.getByLabelText("modal.bundleComponentsLabel"), {
      target: { value: "BB-400" },
    });

    expect(screen.getByText("Breadboard")).toBeInTheDocument();
    expect(screen.queryByText("Arduino Nano")).not.toBeInTheDocument();
  });

  it("calls onComponentsChange with new product when a product is selected from the dropdown", () => {
    const onChange = jest.fn();
    renderSelector({ onComponentsChange: onChange });

    fireEvent.change(screen.getByLabelText("modal.bundleComponentsLabel"), {
      target: { value: "Arduino" },
    });
    fireEvent.click(screen.getByText("Arduino Nano"));

    expect(onChange).toHaveBeenCalledWith([{ productId: "prod-a", quantity: 1 }]);
  });

  it("adds a variant product with its first active variant selected", async () => {
    const onChange = jest.fn();
    renderSelector({ onComponentsChange: onChange });

    fireEvent.change(screen.getByLabelText("modal.bundleComponentsLabel"), {
      target: { value: "T-Shirt" },
    });
    fireEvent.click(screen.getByText("T-Shirt"));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([{ productId: "prod-variant", variantId: "variant-red", quantity: 1 }]);
    });
  });

  it("excludes bundle products from the searchable list", () => {
    renderSelector();

    fireEvent.change(screen.getByLabelText("modal.bundleComponentsLabel"), {
      target: { value: "Starter" },
    });

    expect(screen.queryByText("Starter Kit")).not.toBeInTheDocument();
  });

  it("excludes already-selected products from the searchable list", () => {
    renderSelector({
      selectedProducts: [{ productId: "prod-a", quantity: 1 }],
    });

    fireEvent.change(screen.getByLabelText("modal.bundleComponentsLabel"), {
      target: { value: "Arduino" },
    });

    expect(screen.getByText("modal.bundleComponentsNotFound")).toBeInTheDocument();
  });

  it("shows not found message when search yields no results", () => {
    renderSelector();

    fireEvent.change(screen.getByLabelText("modal.bundleComponentsLabel"), {
      target: { value: "zzz-no-match" },
    });

    expect(screen.getByText("modal.bundleComponentsNotFound")).toBeInTheDocument();
  });

  it("calls onComponentsChange without the removed product when delete is pressed", () => {
    const onChange = jest.fn();
    renderSelector({
      selectedProducts: [
        { productId: "prod-a", quantity: 2 },
        { productId: "prod-b", quantity: 1 },
      ],
      onComponentsChange: onChange,
    });

    const deleteButtons = screen.getAllByRole("button", { name: "delete" });
    fireEvent.click(deleteButtons[0]);

    expect(onChange).toHaveBeenCalledWith([{ productId: "prod-b", quantity: 1 }]);
  });

  it("calls onComponentsChange with updated quantity when quantity input changes", () => {
    const onChange = jest.fn();
    renderSelector({
      selectedProducts: [{ productId: "prod-a", quantity: 1 }],
      onComponentsChange: onChange,
    });

    fireEvent.change(screen.getByLabelText("modal.bundleComponentQuantityLabel"), {
      target: { value: "3" },
    });

    expect(onChange).toHaveBeenCalledWith([{ productId: "prod-a", quantity: 3 }]);
  });

  it("calls onComponentsChange with the selected variant when variant selection changes", async () => {
    const onChange = jest.fn();
    renderSelector({
      selectedProducts: [{ productId: "prod-variant", variantId: "variant-red", quantity: 1 }],
      onComponentsChange: onChange,
    });

    const variantSelect = await screen.findByLabelText("modal.bundleComponentVariantLabel");
    fireEvent.change(variantSelect, { target: { value: "variant-blue" } });

    expect(onChange).toHaveBeenCalledWith([{ productId: "prod-variant", variantId: "variant-blue", quantity: 1 }]);
  });

  it("calls onComponentsChange with updated quantity when the stepper is used", () => {
    const onChange = jest.fn();
    renderSelector({
      selectedProducts: [{ productId: "prod-a", quantity: 2 }],
      onComponentsChange: onChange,
    });

    fireEvent.click(screen.getByLabelText("modal.bundleComponentQuantityLabel increment"));

    expect(onChange).toHaveBeenCalledWith([{ productId: "prod-a", quantity: 3 }]);
  });

  it("enforces a minimum quantity of 1", () => {
    const onChange = jest.fn();
    renderSelector({
      selectedProducts: [{ productId: "prod-a", quantity: 2 }],
      onComponentsChange: onChange,
    });

    fireEvent.change(screen.getByLabelText("modal.bundleComponentQuantityLabel"), {
      target: { value: "0" },
    });

    expect(onChange).toHaveBeenCalledWith([{ productId: "prod-a", quantity: 1 }]);
  });

  it("displays the price reference based on selected product prices and quantities", () => {
    renderSelector({
      selectedProducts: [
        { productId: "prod-a", quantity: 2 },
        { productId: "prod-b", quantity: 1 },
      ],
    });

    const priceLine = screen.getByText(/modal\.bundleComponentsPriceReference/, { selector: "p" });
    expect(priceLine).toBeInTheDocument();
    expect(priceLine).toHaveTextContent("$39.00");
  });

  it("uses selected variant price in the price reference", async () => {
    renderSelector({
      selectedProducts: [{ productId: "prod-variant", variantId: "variant-blue", quantity: 2 }],
    });

    await screen.findByLabelText("modal.bundleComponentVariantLabel");
    const priceLine = screen.getByText(/modal\.bundleComponentsPriceReference/, { selector: "p" });

    expect(priceLine).toHaveTextContent("$28.00");
  });

  it("counts variant components that carry no cost data in the price reference", async () => {
    renderSelector({
      selectedProducts: [
        { productId: "prod-a", quantity: 1 },
        { productId: "prod-variant", variantId: "variant-red", quantity: 1 },
      ],
    });

    await screen.findByLabelText("modal.bundleComponentVariantLabel");
    const priceLine = screen.getByText(/modal\.bundleComponentsPriceReference/, { selector: "p" });

    expect(priceLine).toHaveTextContent("$27.00");
  });
});
