import { render, screen, fireEvent } from "@testing-library/react";

import { ProductsTable } from "../ProductsTable";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@heroui/react", () => ({
  Table: ({ children }) => <table>{children}</table>,
  TableHeader: ({ children }) => <thead><tr>{children}</tr></thead>,
  TableColumn: ({ children, className }) => <th className={className}>{children}</th>,
  TableBody: ({ children }) => <tbody>{children}</tbody>,
  TableRow: ({ children }) => <tr>{children}</tr>,
  TableCell: ({ children, className }) => <td className={className}>{children}</td>,
  Chip: ({ children, className }) => <span className={className}>{children}</span>,
  Image: ({ src, alt }) => <div role="img" aria-label={alt} data-src={src} />,
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

jest.mock("@/components/shared/VariantsButton", () => ({
  VariantsButton: ({ onPress, children }) => <button data-testid="variants-button" onClick={onPress}>{children}</button>,
}));

jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children }) => children,
}));

const mockStoredAssetUrl = jest.fn((url) => (url ? `cdn${url}` : null));
jest.mock("@/components/utils/storedAssetUrl", () => ({
  __esModule: true,
  storedAssetUrl: (...args) => mockStoredAssetUrl(...args),
}));

const categoryNameById = {
  "cat-1": "Category 1",
};

const products = [
  {
    id: 1,
    name: "Jade Wallet",
    description: "Hardware wallet",
    SKU: "jade-wallet",
    categoryIds: ["cat-1"],
    hasVariants: false,
    imageUrl: "/images/jade.png",
  },
  {
    id: 2,
    name: "No Cat",
    description: "Missing category",
    SKU: "no-cat",
    categoryIds: ["missing"],
    hasVariants: true,
    imageUrl: "/images/no-cat.png",
  },
];

const defaultProps = {
  products,
  categoryNameById,
  canManageProducts: true,
  onEditProduct: jest.fn(),
  onDeleteProduct: jest.fn(),
  onViewProduct: jest.fn(),
  onManageVariants: jest.fn(),
};

function renderTable(props = {}) {
  return render(<ProductsTable {...defaultProps} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ProductsTable", () => {
  it("renders column headers", () => {
    renderTable();

    expect(screen.getByText("image")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("description")).toBeInTheDocument();
    expect(screen.getByText("category")).toBeInTheDocument();
    expect(screen.getByText("sku")).toBeInTheDocument();
    expect(screen.getByText("stock")).toBeInTheDocument();
    expect(screen.getByText("actions")).toBeInTheDocument();
  });

  it("renders product name and SKU", () => {
    renderTable();

    expect(screen.getByText("Jade Wallet")).toBeInTheDocument();
    expect(screen.getByText("jade-wallet")).toBeInTheDocument();
  });

  it("does not render variants button for simple product", () => {
    renderTable({ products: [products[0]] });
    expect(screen.queryByTestId("variants-button")).not.toBeInTheDocument();
  });

  it("renders variants button for variant product", () => {
    renderTable({ products: [products[1]] });
    expect(screen.getByTestId("variants-button")).toBeInTheDocument();
  });

  it("renders category name chip when category is found", () => {
    renderTable();
    expect(screen.getByText("Category 1")).toBeInTheDocument();
  });

  it("renders noCategory chip when category id is unknown", () => {
    renderTable();
    expect(screen.getByText("noCategory")).toBeInTheDocument();
  });

  it("renders product images via storedAssetUrl", () => {
    renderTable();

    expect(mockStoredAssetUrl).toHaveBeenCalledWith("/images/jade.png");
    expect(screen.getByRole("img", { name: "Jade Wallet" }).getAttribute("data-src")).toBe("cdn/images/jade.png");
  });

  it("renders an image placeholder when imageUrl is missing", () => {
    renderTable({
      products: [{ ...products[0], imageUrl: null }],
    });

    expect(screen.getByTestId("product-table-image-placeholder-1")).toBeInTheDocument();
  });

  it("calls onEditProduct when edit button is clicked", () => {
    const onEditProduct = jest.fn();
    renderTable({ onEditProduct });

    fireEvent.click(screen.getAllByText("edit")[0].closest("button"));
    expect(onEditProduct).toHaveBeenCalledWith(products[0]);
  });

  it("calls onDeleteProduct when delete button is clicked", () => {
    const onDeleteProduct = jest.fn();
    renderTable({ onDeleteProduct });

    fireEvent.click(screen.getAllByText("delete")[1].closest("button"));
    expect(onDeleteProduct).toHaveBeenCalledWith(products[1]);
  });

  it("hides actions column when canManageProducts is false", () => {
    renderTable({ canManageProducts: false });

    expect(screen.queryByText("edit")).not.toBeInTheDocument();
    expect(screen.queryByText("delete")).not.toBeInTheDocument();
  });

  it("always renders view buttons regardless of canManageProducts", () => {
    renderTable({ canManageProducts: false });

    expect(screen.getAllByTestId("view-button")).toHaveLength(products.length);
  });

  it("calls onViewProduct when view button is clicked", () => {
    const onViewProduct = jest.fn();
    renderTable({ onViewProduct });

    fireEvent.click(screen.getAllByTestId("view-button")[0]);
    expect(onViewProduct).toHaveBeenCalledWith(products[0]);
  });

  it("shows plain quantity in stock chip and bundle chip in type column for bundle products", () => {
    renderTable({
      products: [{ ...products[0], isBundle: true, quantity: 7 }],
    });

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("bundle")).toBeInTheDocument();
  });

  it("shows plain quantity and regular chip in type column for non-bundle products", () => {
    renderTable({ products: [products[0]] });

    expect(screen.getByText("regular")).toBeInTheDocument();
    expect(screen.queryByText("bundle")).not.toBeInTheDocument();
  });

  it("uses fixed stock threshold for out, low, and ok status", () => {
    renderTable({
      products: [
        { ...products[0], id: "out", quantity: 0 },
        { ...products[0], id: "low", quantity: 10 },
        { ...products[0], id: "ok", quantity: 11 },
      ],
    });

    expect(screen.getByText("status.out")).toHaveClass("bg-rose-100");
    expect(screen.getByText("status.low")).toHaveClass("bg-amber-100");
    expect(screen.getByText("status.ok")).toHaveClass("bg-green-200");
  });

  it("shows N/A and the untracked status for products without stock tracking", () => {
    renderTable({
      products: [{ ...products[0], id: "service", quantity: 0, trackStock: false }],
    });

    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.getByText("status.untracked")).toHaveClass("bg-gray-100");
    expect(screen.queryByText("status.out")).not.toBeInTheDocument();
  });
});
