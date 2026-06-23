import { render, screen, fireEvent } from "@testing-library/react";

import { CartItemCard } from "../CartItemCard";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ formatAmount: (value) => `fmt-${value}` }),
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress }) => (
    <button aria-label="Remove Product" onClick={onPress} />
  ),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return {
    ...actual,
    NumberInput: ({ label, value, onChange }) => (
      <input aria-label={label} value={value} onChange={(e) => onChange?.(e.target.value)} />
    ),
  };
});

jest.mock("lucide-react", () => ({
  ImageIcon: () => <span data-testid="image-icon" />,
}));

const defaultItem = {
  id: 1,
  name: "Jade Wallet",
  price: 1000,
  quantity: 2,
  subtotal: 2000,
  imageUrl: "/uploads/jade-wallet.png",
};

describe("CartItemCard", () => {
  it("renders item name", () => {
    render(<CartItemCard item={defaultItem} onRemove={jest.fn()} onUpdateQuantity={jest.fn()} />);
    expect(screen.getByText("Jade Wallet")).toBeInTheDocument();
  });

  it("renders formatted price and subtotal", () => {
    render(<CartItemCard item={defaultItem} onRemove={jest.fn()} onUpdateQuantity={jest.fn()} />);
    expect(screen.getByText(/fmt-1000/)).toBeInTheDocument();
    expect(screen.getByText("fmt-2000")).toBeInTheDocument();
  });

  it("renders the product image when imageUrl is present", () => {
    render(<CartItemCard item={defaultItem} onRemove={jest.fn()} onUpdateQuantity={jest.fn()} />);
    expect(screen.getByRole("img", { name: "Jade Wallet" })).toHaveAttribute(
      "src",
      "/uploads/jade-wallet.png",
    );
  });

  it("renders a placeholder when imageUrl is missing", () => {
    render(
      <CartItemCard
        item={{ ...defaultItem, imageUrl: undefined }}
        onRemove={jest.fn()}
        onUpdateQuantity={jest.fn()}
      />,
    );
    expect(screen.getByTestId("summary-image-placeholder-1")).toBeInTheDocument();
  });

  it("calls onRemove when delete button is pressed", () => {
    const onRemove = jest.fn();
    render(<CartItemCard item={defaultItem} onRemove={onRemove} onUpdateQuantity={jest.fn()} />);
    fireEvent.click(screen.getByLabelText("Remove Product"));
    expect(onRemove).toHaveBeenCalled();
  });

  it("calls onUpdateQuantity with item id and new value when quantity changes", () => {
    const onUpdateQuantity = jest.fn();
    render(<CartItemCard item={defaultItem} onRemove={jest.fn()} onUpdateQuantity={onUpdateQuantity} />);
    fireEvent.change(screen.getByLabelText("summary.quantity"), { target: { value: "5" } });
    expect(onUpdateQuantity).toHaveBeenCalledWith(1, 5);
  });
});
