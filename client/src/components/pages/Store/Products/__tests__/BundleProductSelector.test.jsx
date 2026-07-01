import { render, screen, fireEvent } from "@testing-library/react";

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
  NumberInput: ({ "aria-label": ariaLabel, value, onValueChange, onChange }) => (
    <input
      aria-label={ariaLabel}
      type="number"
      value={value}
      onChange={(event) => {
        onValueChange?.(Number(event.target.value));
        onChange?.(event);
      }}
    />
  ),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatAmount: (cents) => `$${(cents / 100).toFixed(2)}`,
  }),
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress }) => (
    <button type="button" onClick={onPress}>
      delete
    </button>
  ),
}));

const productA = { id: "prod-a", name: "Arduino Nano", SKU: "ARD-NANO", costCents: 500, isBundle: false };
const productB = { id: "prod-b", name: "Breadboard", SKU: "BB-400", costCents: 300, isBundle: false };
const bundleProduct = { id: "prod-bundle", name: "Starter Kit", SKU: "KIT-1", costCents: 1000, isBundle: true };

const allProducts = [productA, productB, bundleProduct];

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

  it("displays the cost reference based on selected product costs and quantities", () => {
    renderSelector({
      selectedProducts: [
        { productId: "prod-a", quantity: 2 },
        { productId: "prod-b", quantity: 1 },
      ],
    });

    const costLine = screen.getByText(/modal\.bundleCostReference/, { selector: "p" });
    expect(costLine).toBeInTheDocument();
    expect(costLine).toHaveTextContent("$13.00");
  });
});
