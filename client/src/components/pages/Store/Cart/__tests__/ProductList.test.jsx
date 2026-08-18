import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { ProductList } from "../ProductList";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatAmount: (amountCents) => `fmt-${amountCents}`,
  }),
}));

jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  Accordion: ({ children }) => <div>{children}</div>,
  AccordionItem: ({ children, title, "aria-label": ariaLabel }) => (
    <div>
      <button aria-label={ariaLabel}>{title}</button>
      <div>{children}</div>
    </div>
  ),
  Chip: ({ children, className }) => <span className={className}>{children}</span>,
}));

jest.mock("@/components/shared/ViewButton", () => ({
  ViewButton: ({ onPress, children }) => (
    <button data-testid="view-button" onClick={onPress}>{children}</button>
  ),
}));

jest.mock("@/components/shared/ProductDetailsModal", () => ({
  ProductDetailsModal: ({ isOpen, onClose, product, showAddButton }) => (isOpen ? (
    <div data-testid="product-details-modal">
      <span data-testid="modal-product-name">{product?.name}</span>
      {showAddButton && <button>modal-add</button>}
      <button onClick={onClose}>close-modal</button>
    </div>
  ) : null),
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

const productWithDescription = {
  id: 3,
  name: "M5 StickPlus",
  SKU: "m5-stickplus",
  categoryIds: ["cat-1"],
  priceCents: 900,
  quantity: 5,
  description: "A compact IoT device with built-in display.",
};

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
    expect(screen.getByText("card.noCategory")).toBeInTheDocument();
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

  it("renders description accordion title and content for a product with description", () => {
    render(
      <I18nProvider>
        <ProductList
          products={[productWithDescription]}
          categories={categories}
          onAddProduct={jest.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("card.showProductDescription")).toBeInTheDocument();
    expect(screen.getByText("A compact IoT device with built-in display.")).toBeInTheDocument();
  });

  it("does not render description accordion for products without description", () => {
    render(
      <I18nProvider>
        <ProductList
          products={products}
          categories={categories}
          onAddProduct={jest.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.queryByText("card.showProductDescription")).not.toBeInTheDocument();
  });

  it("does not show ProductDetailsModal initially", () => {
    render(
      <I18nProvider>
        <ProductList
          products={[productWithDescription]}
          categories={categories}
          onAddProduct={jest.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.queryByTestId("product-details-modal")).not.toBeInTheDocument();
  });

  it("opens ProductDetailsModal with the correct product when ViewButton is clicked", () => {
    render(
      <I18nProvider>
        <ProductList
          products={[productWithDescription]}
          categories={categories}
          onAddProduct={jest.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByTestId("view-button"));

    expect(screen.getByTestId("product-details-modal")).toBeInTheDocument();
    expect(screen.getByTestId("modal-product-name")).toHaveTextContent("M5 StickPlus");
  });

  it("opens ProductDetailsModal with showAddButton=false", () => {
    render(
      <I18nProvider>
        <ProductList
          products={[productWithDescription]}
          categories={categories}
          onAddProduct={jest.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByTestId("view-button"));

    expect(screen.queryByText("modal-add")).not.toBeInTheDocument();
  });

  it("closes ProductDetailsModal when onClose is called", () => {
    render(
      <I18nProvider>
        <ProductList
          products={[productWithDescription]}
          categories={categories}
          onAddProduct={jest.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByTestId("view-button"));
    expect(screen.getByTestId("product-details-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("close-modal"));

    expect(screen.queryByTestId("product-details-modal")).not.toBeInTheDocument();
  });

  it("shows bundle chip for bundle products", () => {
    render(
      <I18nProvider>
        <ProductList
          products={[{ ...products[0], isBundle: true }]}
          categories={categories}
          onAddProduct={jest.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getAllByText("card.bundle")).not.toHaveLength(0);
  });

  it("does not show bundle chip for non-bundle products", () => {
    render(
      <I18nProvider>
        <ProductList
          products={products}
          categories={categories}
          onAddProduct={jest.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.queryByText("card.bundle")).not.toBeInTheDocument();
  });

  it("uses shared stock status styles with the fixed low-stock threshold", () => {
    render(
      <I18nProvider>
        <ProductList
          products={[
            { ...products[0], id: "out", quantity: 0 },
            { ...products[0], id: "low", quantity: 10 },
            { ...products[0], id: "ok", quantity: 11 },
          ]}
          categories={categories}
          onAddProduct={jest.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("0 card.stock")).toHaveClass("bg-rose-100");
    expect(screen.getByText("10 card.stock")).toHaveClass("bg-amber-100");
    expect(screen.getByText("11 card.stock")).toHaveClass("bg-green-200");
  });

  it("hides the stock chip and keeps add enabled for products without stock tracking", () => {
    render(
      <I18nProvider>
        <ProductList
          products={[{ ...products[0], id: "service", quantity: 0, trackStock: false }]}
          categories={categories}
          onAddProduct={jest.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.queryByText("0 card.stock")).not.toBeInTheDocument();
    expect(screen.getByText("card.add")).not.toBeDisabled();
  });

  it("keeps add disabled for tracked products that are out of stock", () => {
    render(
      <I18nProvider>
        <ProductList
          products={[{ ...products[0], id: "out", quantity: 0 }]}
          categories={categories}
          onAddProduct={jest.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("card.add")).toBeDisabled();
  });
});
