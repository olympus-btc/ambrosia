import { render, screen, fireEvent } from "@testing-library/react";

import { VariantSelectorModal } from "../VariantSelectorModal";

const mockUseVariantSelector = jest.fn();
jest.mock("@/components/pages/Store/Cart/hooks/useVariantSelector", () => ({
  useVariantSelector: (...selectorHookArgs) => mockUseVariantSelector(...selectorHookArgs),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ formatAmount: (amountCents) => `$${(amountCents / 100).toFixed(2)}` }),
}));

jest.mock("@heroui/react", () => ({
  Modal: ({ isOpen, children }) => (isOpen ? <div role="dialog">{children}</div> : null),
  ModalContent: ({ children }) => <div>{children}</div>,
  ModalHeader: ({ children }) => <div>{children}</div>,
  ModalBody: ({ children }) => <div>{children}</div>,
  ModalFooter: ({ children }) => <div>{children}</div>,
  Button: ({ children, onPress, isDisabled }) => (
    <button onClick={onPress} disabled={isDisabled}>
      {children}
    </button>
  ),
}));

const product = { id: "p1", name: "T-Shirt" };

const defaultHookState = {
  options: [],
  isLoading: false,
  selectedValues: {},
  allSelected: false,
  isDisabled: true,
  matchedVariant: null,
  isOutOfStock: false,
  isValueAvailable: jest.fn().mockReturnValue(true),
  toggleOptionValue: jest.fn(),
  handleAddToCart: jest.fn(),
};

function renderModal(componentProps = {}, selectorHookState = {}) {
  mockUseVariantSelector.mockReturnValue({ ...defaultHookState, ...selectorHookState });
  return render(
    <VariantSelectorModal
      product={product}
      isOpen
      onClose={jest.fn()}
      onAddToCart={jest.fn()}
      {...componentProps}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("VariantSelectorModal", () => {
  it("renders the modal with product name", () => {
    renderModal();
    expect(screen.getByText("T-Shirt")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    mockUseVariantSelector.mockReturnValue(defaultHookState);
    render(
      <VariantSelectorModal product={product} isOpen={false} onClose={jest.fn()} onAddToCart={jest.fn()} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows loading message while fetching", () => {
    renderModal({}, { isLoading: true });
    expect(screen.getByText("variantSelector.loading")).toBeInTheDocument();
  });

  it("renders option type names and values", () => {
    const options = [
      {
        id: "type-color",
        name: "Color",
        values: [
          { id: "val-red", value: "Red" },
          { id: "val-blue", value: "Blue" },
        ],
      },
    ];
    renderModal({}, { options, isLoading: false });

    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
  });

  it("calls toggleOptionValue when an option value button is pressed", () => {
    const toggleOptionValue = jest.fn();
    const options = [
      {
        id: "type-color",
        name: "Color",
        values: [{ id: "val-red", value: "Red" }],
      },
    ];
    renderModal({}, { options, isLoading: false, toggleOptionValue });

    fireEvent.click(screen.getByText("Red"));
    expect(toggleOptionValue).toHaveBeenCalledWith("type-color", "val-red");
  });

  it("shows 'no variant found' message when all selected but no match", () => {
    renderModal({}, { allSelected: true, matchedVariant: null });
    expect(screen.getByText("variantSelector.noVariantFound")).toBeInTheDocument();
  });

  it("shows price and in-stock quantity when a variant is matched", () => {
    const matchedVariant = { id: "v1", priceCents: 1500, quantity: 3 };
    renderModal({}, { matchedVariant, isOutOfStock: false });

    expect(screen.getByText("$15.00")).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it("shows out-of-stock message when matched variant has no stock", () => {
    const matchedVariant = { id: "v2", priceCents: 1000, quantity: 0 };
    renderModal({}, { matchedVariant, isOutOfStock: true });

    expect(screen.getByText("variantSelector.outOfStock")).toBeInTheDocument();
  });

  it("calls onClose when cancel button is pressed", () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("variantSelector.cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls handleAddToCart when add-to-cart button is pressed", () => {
    const handleAddToCart = jest.fn();
    renderModal({}, { isDisabled: false, handleAddToCart });
    fireEvent.click(screen.getByText("variantSelector.addToCart"));
    expect(handleAddToCart).toHaveBeenCalled();
  });

  it("add-to-cart button is disabled when isDisabled is true", () => {
    renderModal({}, { isDisabled: true });
    expect(screen.getByText("variantSelector.addToCart")).toBeDisabled();
  });

  it("passes product, isOpen, onClose, and onAddToCart to the hook", () => {
    const onClose = jest.fn();
    const onAddToCart = jest.fn();
    mockUseVariantSelector.mockReturnValue(defaultHookState);
    render(
      <VariantSelectorModal product={product} isOpen onClose={onClose} onAddToCart={onAddToCart} />,
    );
    expect(mockUseVariantSelector).toHaveBeenCalledWith(
      expect.objectContaining({ product, isOpen: true, onClose, onAddToCart }),
    );
  });
});
