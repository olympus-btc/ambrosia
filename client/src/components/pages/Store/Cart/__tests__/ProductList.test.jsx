import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { ProductList } from "../ProductList";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatAmount: (value) => `fmt-${value}`,
  }),
}));

const products = [
  {
    id: 1,
    name: "Jade Wallet",
    SKU: "jade-wallet",
    categoryIds: ["cat-1"],
    imageUrl: "/uploads/jade-wallet.png",
    priceCents: 1600,
    quantity: 3,
  },
  {
    id: 2,
    name: "Unknown Category",
    SKU: "unknown",
    categoryIds: ["missing"],
    priceCents: 600,
    quantity: 1,
  },
];

const categories = [
  { id: "cat-1", name: "Hardware" },
];

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe("ProductList", () => {
  it("renders product details and category names", () => {
    render(
      <I18nProvider>
        <ProductList
          products={products}
          categories={categories}
          onAddProduct={jest.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("Jade Wallet")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("fmt-1600")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Jade Wallet" })).toHaveAttribute("src", "/uploads/jade-wallet.png");
    expect(screen.getByTestId("product-image-placeholder-2")).toBeInTheDocument();
    expect(screen.getAllByText("SKU:")).toHaveLength(2);
    expect(screen.getByText("jade-wallet")).toBeInTheDocument();
    expect(screen.getByText("card.errors.unknownCategory")).toBeInTheDocument();
  });

  it("calls onAddProduct when add button is clicked", () => {
    const onAddProduct = jest.fn();
    render(
      <I18nProvider>
        <ProductList
          products={products}
          categories={categories}
          onAddProduct={onAddProduct}
        />
      </I18nProvider>,
    );

    const addButtons = screen.getAllByText("card.add");
    fireEvent.click(addButtons[0]);
    expect(onAddProduct).toHaveBeenCalledWith(products[0]);
  });
});
