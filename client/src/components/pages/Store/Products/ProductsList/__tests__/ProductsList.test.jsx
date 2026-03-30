import { render, screen, fireEvent } from "@testing-library/react";

import { ProductsList } from "../ProductsList";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
  RequirePermission: ({ children }) => children,
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatAmount: (cents) => `$${(cents / 100).toFixed(2)}`,
  }),
}));

const mockStoredAssetUrl = jest.fn((url) => `cdn${url}`);

jest.mock("@/components/utils/storedAssetUrl", () => ({
  __esModule: true,
  storedAssetUrl: (...args) => mockStoredAssetUrl(...args),
}));

const categories = [
  { id: "cat-1", name: "Category 1" },
];

const products = [
  {
    id: 1,
    sku: "jade-wallet",
    name: "Jade Wallet",
    description: "Hardware wallet",
    category_ids: ["cat-1"],
    price_cents: 1600,
    quantity: 10,
    image_url: "/images/jade.png",
  },
  {
    id: 2,
    sku: "jade-plus",
    name: "Jade Plus",
    description: "Hardware wallet plus",
    category_ids: ["cat-1"],
    price_cents: 4000,
    quantity: 5,
    image_url: "/images/jade-plus.png",
  },
  {
    id: 3,
    sku: "unknown-cat",
    name: "No Cat",
    description: "Missing category",
    category_ids: ["missing"],
    price_cents: 0,
    quantity: 1,
    image_url: "/images/no-cat.png",
  },
];

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const renderList = (props = {}) => render(
  <ProductsList
    products={products}
    categories={categories}
    onEditProduct={jest.fn()}
    onDeleteProduct={jest.fn()}
    {...props}
  />,
);

describe("ProductsList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders rows with product data and formatted price", () => {
    renderList();

    expect(screen.getAllByText("Jade Wallet").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Category 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$16.00").length).toBeGreaterThan(0);
  });

  it("falls back to noCategory translation for unknown category ids and formats image src via storedAssetUrl", () => {
    renderList();

    expect(screen.queryByText("missing")).not.toBeInTheDocument();
    expect(screen.getAllByText("noCategory").length).toBeGreaterThan(0);
    expect(mockStoredAssetUrl).toHaveBeenCalledWith("/images/no-cat.png");
  });

  it("handles missing image url gracefully", () => {
    const productsWithoutImage = [
      { ...products[0], image_url: undefined },
    ];

    renderList({ products: productsWithoutImage });
    expect(mockStoredAssetUrl).toHaveBeenCalledWith(undefined);
  });

  it("calls edit and delete callbacks", () => {
    const onEditProduct = jest.fn();
    const onDeleteProduct = jest.fn();

    renderList({ onEditProduct, onDeleteProduct });

    fireEvent.click(screen.getAllByRole("button", { name: "Edit Product" })[0]);
    expect(onEditProduct).toHaveBeenCalledWith(products[0]);

    fireEvent.click(screen.getAllByRole("button", { name: "Delete Product" })[2]);
    expect(onDeleteProduct).toHaveBeenCalledWith(products[2]);
  });
});
