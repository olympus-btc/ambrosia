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
  Image: ({ src, alt, width }) => <div role="img" aria-label={alt} data-src={src} data-width={width} />,
}));

jest.mock("@/components/shared/EditButton", () => ({
  EditButton: ({ onPress, children }) => <button onClick={onPress}>{children}</button>,
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress, children }) => <button onClick={onPress}>{children}</button>,
}));

jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children }) => children,
}));

const mockStoredAssetUrl = jest.fn((url) => `cdn${url}`);
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
    category_ids: ["cat-1"],
    price_cents: 1600,
    quantity: 10,
    image_url: "/images/jade.png",
  },
  {
    id: 2,
    name: "No Cat",
    description: "Missing category",
    SKU: "no-cat",
    category_ids: ["missing"],
    price_cents: 0,
    quantity: 0,
    image_url: "/images/no-cat.png",
  },
];

const mockStatus = jest.fn((product) => {
  if (product.quantity <= 0) return "out";
  if (product.quantity < 11) return "low";
  return "ok";
});

const defaultProps = {
  products,
  categoryNameById,
  status: mockStatus,
  normalizeNumber: (v) => Number(v ?? 0),
  formatAmount: (cents) => `$${(cents / 100).toFixed(2)}`,
  canManageProducts: true,
  onEditProduct: jest.fn(),
  onDeleteProduct: jest.fn(),
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
    expect(screen.getByText("price")).toBeInTheDocument();
    expect(screen.getByText("stock")).toBeInTheDocument();
    expect(screen.getByText("stockStatus")).toBeInTheDocument();
    expect(screen.getByText("actions")).toBeInTheDocument();
  });

  it("renders product name, SKU and formatted price", () => {
    renderTable();

    expect(screen.getByText("Jade Wallet")).toBeInTheDocument();
    expect(screen.getByText("jade-wallet")).toBeInTheDocument();
    expect(screen.getByText("$16.00")).toBeInTheDocument();
  });

  it("renders category name chip when category is found", () => {
    renderTable();

    expect(screen.getByText("Category 1")).toBeInTheDocument();
  });

  it("renders noCategory chip when category id is unknown", () => {
    renderTable();

    expect(screen.getByText("noCategory")).toBeInTheDocument();
  });

  it("calls status function for each product", () => {
    renderTable();

    expect(mockStatus).toHaveBeenCalledTimes(products.length);
  });

  it("renders status chip with translation key", () => {
    renderTable();

    expect(screen.getByText("status.low")).toBeInTheDocument();
    expect(screen.getByText("status.out")).toBeInTheDocument();
  });

  it("renders product images via storedAssetUrl", () => {
    renderTable();

    expect(mockStoredAssetUrl).toHaveBeenCalledWith("/images/jade.png");
    expect(screen.getByRole("img", { name: "Jade Wallet" }).getAttribute("data-src")).toBe("cdn/images/jade.png");
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

    const actionsHeader = screen.getByText("actions");
    expect(actionsHeader.closest("th")).toHaveClass("hidden");
  });
});
