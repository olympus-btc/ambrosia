import { render, screen, fireEvent } from "@testing-library/react";

import { SearchProducts } from "../SearchProducts";

const mockProductList = jest.fn(() => null);

jest.mock("../ProductList", () => ({
  ProductList: (props) => {
    mockProductList(props);
    return (
      <div data-testid="product-list">
        {props.products.map((product) => product.name).join(",")}
      </div>
    );
  },
}));

const products = [
  {
    id: 1,
    name: "Jade Wallet",
    SKU: "jade-wallet",
    category_id: "cat-1",
    quantity: 5,
  },
  {
    id: 2,
    name: "M5 Stick",
    SKU: "m5-stick",
    category_id: "cat-2",
    quantity: 2,
  },
  {
    id: 3,
    name: "Out of Stock",
    SKU: "empty",
    category_id: "cat-1",
    quantity: 0,
  },
  {
    id: 4,
    name: "Unknown Category",
    SKU: "unknown-cat",
    category_id: "missing",
    quantity: 1,
  },
];

const categories = [
  { id: "cat-1", name: "Hardware" },
  { id: "cat-2", name: "Gadgets" },
];

describe("SearchProducts", () => {
  beforeEach(() => {
    mockProductList.mockClear();
  });

  it("renders search input and category filters", () => {
    render(
      <SearchProducts
        products={products}
        categories={categories}
        onAddProduct={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("search.label")).toBeInTheDocument();
    expect(screen.getByText("search.filterAll")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Gadgets")).toBeInTheDocument();
  });

  it("filters products by search term", () => {
    render(
      <SearchProducts
        products={products}
        categories={categories}
        onAddProduct={jest.fn()}
      />,
    );

    const list = screen.getByTestId("product-list");
    expect(list.textContent).toContain("Jade Wallet");
    expect(list.textContent).toContain("M5 Stick");
    expect(list.textContent).toContain("Out of Stock");
    expect(list.textContent).toContain("Unknown Category");

    fireEvent.change(screen.getByLabelText("search.label"), {
      target: { value: "jade" },
    });
    expect(screen.getByTestId("product-list").textContent).toContain("Jade Wallet");

    fireEvent.change(screen.getByLabelText("search.label"), {
      target: { value: "hardware" },
    });
    expect(screen.getByTestId("product-list").textContent).toContain("Jade Wallet");
  });

  it("filters by category selection", () => {
    render(
      <SearchProducts
        products={products}
        categories={categories}
        onAddProduct={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Gadgets"));
    expect(screen.getByTestId("product-list").textContent).toContain("M5 Stick");
    expect(screen.getByTestId("product-list").textContent).not.toContain("Jade Wallet");

    fireEvent.click(screen.getByText("search.filterAll"));
    expect(screen.getByTestId("product-list").textContent).toContain("Jade Wallet");
  });
});
