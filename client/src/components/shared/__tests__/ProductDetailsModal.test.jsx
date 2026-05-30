import { render, screen, fireEvent } from "@testing-library/react";

import { ProductDetailsModal } from "../ProductDetailsModal";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatAmount: (value) => `fmt-${value}`,
  }),
}));

jest.mock("@heroui/react", () => ({
  Modal: ({ isOpen, children }) => (isOpen ? <div data-testid="modal">{children}</div> : null),
  ModalContent: ({ children }) => (
    <div>{typeof children === "function" ? children() : children}</div>
  ),
  ModalHeader: ({ children }) => <div data-testid="modal-header">{children}</div>,
  ModalBody: ({ children }) => <div data-testid="modal-body">{children}</div>,
  ModalFooter: ({ children }) => <div data-testid="modal-footer">{children}</div>,
  Button: ({ children, onPress, isDisabled }) => (
    <button onClick={onPress} disabled={isDisabled}>
      {children}
    </button>
  ),
  Chip: ({ children }) => <span>{children}</span>,
  Image: () => null,
}));

const baseProduct = {
  id: 1,
  name: "Jade Wallet",
  SKU: "jade-wallet",
  categoryIds: ["cat-1"],
  imageUrl: "/uploads/jade-wallet.png",
  priceCents: 1600,
  quantity: 5,
  description: "A premium hardware wallet.",
};

const categories = [{ id: "cat-1", name: "Hardware" }];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onAddProduct: jest.fn(),
  showAddButton: true,
  product: baseProduct,
  categories,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ProductDetailsModal", () => {
  it("returns null when no product is provided", () => {
    const { container } = render(
      <ProductDetailsModal {...defaultProps} product={null} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when isOpen is false", () => {
    render(<ProductDetailsModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("renders product name, price, SKU and category", () => {
    render(<ProductDetailsModal {...defaultProps} />);

    expect(screen.getByText("Jade Wallet")).toBeInTheDocument();
    expect(screen.getByText("fmt-1600")).toBeInTheDocument();
    expect(screen.getByText("jade-wallet")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
  });

  it("renders description label with text-primary class", () => {
    render(<ProductDetailsModal {...defaultProps} />);

    expect(screen.getByText("description")).toHaveClass("text-primary");
  });

  it("renders description text with text-xs and text-gray-400 classes", () => {
    render(<ProductDetailsModal {...defaultProps} />);

    expect(screen.getByText("A premium hardware wallet.")).toHaveClass("text-xs", "text-gray-400");
  });

  it("does not render description section when product has no description", () => {
    render(
      <ProductDetailsModal {...defaultProps} product={{ ...baseProduct, description: undefined }} />,
    );

    expect(screen.queryByText("description")).not.toBeInTheDocument();
    expect(screen.queryByText("A premium hardware wallet.")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    render(<ProductDetailsModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText("close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onAddProduct with the product and onClose when add button is pressed", () => {
    const onAddProduct = jest.fn();
    const onClose = jest.fn();
    render(
      <ProductDetailsModal {...defaultProps} onAddProduct={onAddProduct} onClose={onClose} />,
    );

    fireEvent.click(screen.getByText("add"));

    expect(onAddProduct).toHaveBeenCalledWith(baseProduct);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("hides add button when showAddButton is false", () => {
    render(<ProductDetailsModal {...defaultProps} showAddButton={false} />);

    expect(screen.queryByText("add")).not.toBeInTheDocument();
    expect(screen.getByText("close")).toBeInTheDocument();
  });

  it("disables add button when product is out of stock", () => {
    render(
      <ProductDetailsModal {...defaultProps} product={{ ...baseProduct, quantity: 0 }} />,
    );

    expect(screen.getByText("add")).toBeDisabled();
  });
});
