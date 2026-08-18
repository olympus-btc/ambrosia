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
    NumberInput: require("@/test-utils/numberInputMock").NumberInputMock,
  };
});

jest.mock("lucide-react", () => ({
  ImageIcon: () => <span aria-hidden="true" />,
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

  it("calls onUpdateQuantity with item id and new value when quantity is typed", () => {
    const onUpdateQuantity = jest.fn();
    render(<CartItemCard item={defaultItem} onRemove={jest.fn()} onUpdateQuantity={onUpdateQuantity} />);
    fireEvent.change(screen.getByLabelText("summary.quantity"), { target: { value: "5" } });
    expect(onUpdateQuantity).toHaveBeenCalledWith(1, 5);
  });

  it("calls onUpdateQuantity with a number when the stepper is used", () => {
    const onUpdateQuantity = jest.fn();
    render(<CartItemCard item={defaultItem} onRemove={jest.fn()} onUpdateQuantity={onUpdateQuantity} />);
    fireEvent.click(screen.getByLabelText("summary.quantity increment"));
    expect(onUpdateQuantity).toHaveBeenCalledWith(1, 3);
  });

  it("reports NaN instead of zero while the quantity field is empty", () => {
    const onUpdateQuantity = jest.fn();
    render(<CartItemCard item={defaultItem} onRemove={jest.fn()} onUpdateQuantity={onUpdateQuantity} />);
    fireEvent.change(screen.getByLabelText("summary.quantity"), { target: { value: "" } });
    expect(onUpdateQuantity).toHaveBeenCalledWith(1, NaN);
  });
});
