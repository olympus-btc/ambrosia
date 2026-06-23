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

jest.mock("@/components/shared/EditButton", () => ({
  EditButton: ({ onPress, children }) => <button onClick={onPress}>{children}</button>,
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress, children }) => <button onClick={onPress}>{children}</button>,
}));

jest.mock("@/components/shared/ViewButton", () => ({
  ViewButton: ({ onPress, children }) => <button data-testid="view-button" onClick={onPress}>{children}</button>,
}));

jest.mock("@/components/shared/ProductDetailsModal", () => ({
  ProductDetailsModal: ({ isOpen, product }) => (isOpen ? <div data-testid="product-details-modal">{product?.name}</div> : null),
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
    categoryIds: ["cat-1"],
    priceCents: 1600,
    quantity: 10,
    imageUrl: "/images/jade.png",
  },
  {
    id: 2,
    sku: "jade-plus",
    name: "Jade Plus",
    description: "Hardware wallet plus",
    categoryIds: ["cat-1"],
    priceCents: 4000,
    quantity: 5,
    imageUrl: "/images/jade-plus.png",
  },
  {
    id: 3,
    sku: "unknown-cat",
    name: "No Cat",
    description: "Missing category",
    categoryIds: ["missing"],
    priceCents: 0,
    quantity: 1,
    imageUrl: "/images/no-cat.png",
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
      { ...products[0], imageUrl: undefined },
    ];

    renderList({ products: productsWithoutImage });
    expect(mockStoredAssetUrl).toHaveBeenCalledWith(undefined);
  });

  it("calls edit and delete callbacks", () => {
    const onEditProduct = jest.fn();
    const onDeleteProduct = jest.fn();

    renderList({ onEditProduct, onDeleteProduct });

    fireEvent.click(screen.getAllByText("edit")[0].closest("button"));
    expect(onEditProduct).toHaveBeenCalledWith(products[0]);

    fireEvent.click(screen.getAllByText("delete")[2].closest("button"));
    expect(onDeleteProduct).toHaveBeenCalledWith(products[2]);
  });

  it("opens ProductDetailsModal when view button is clicked", () => {
    renderList();

    expect(screen.queryByTestId("product-details-modal")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId("view-button")[0]);

    expect(screen.getByTestId("product-details-modal")).toBeInTheDocument();
    expect(screen.getByTestId("product-details-modal")).toHaveTextContent("Jade Wallet");
  });
});
