import { render, screen, fireEvent } from "@testing-library/react";

import { SalesDetailCard } from "../SalesDetailCard";

const mockExportToCsv = jest.fn();
const mockSetPage = jest.fn();
const mockHandleRowsPerPage = jest.fn();

let mockUseSalesData = {
  paginatedSales: [],
  totalPages: 1,
  page: 1,
  setPage: mockSetPage,
  rowsPerPage: 10,
  handleRowsPerPageChange: mockHandleRowsPerPage,
  exportToCsv: mockExportToCsv,
};

jest.mock("../../hooks/useSalesData", () => ({
  useSalesData: () => mockUseSalesData,
}));

jest.mock("../SalesFilters", () => ({
  SalesFilters: () => <div data-testid="sales-filters" />,
}));

jest.mock("../SalesList", () => ({
  SalesList: () => <div data-testid="sales-list" />,
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Button: ({ children, onPress, isDisabled }) => (
    <button data-testid="export-button" onClick={onPress} disabled={isDisabled}>{children}</button>
  ),
  Select: ({ children, onSelectionChange, selectedKeys }) => (
    <select
      data-testid="rows-per-page-select"
      onChange={(e) => onSelectionChange(new Set([e.target.value]))}
      defaultValue={[...selectedKeys][0]}
    >
      {children}
    </select>
  ),
  SelectItem: ({ children }) => <option>{children}</option>,
  Pagination: ({ total, page, onChange }) => (
    <div data-testid="pagination" data-total={total} data-page={page}>
      <button onClick={() => onChange(page + 1)}>next</button>
    </div>
  ),
}));

jest.mock("lucide-react", () => ({
  Download: () => null,
}));

const SALES = [
  { productName: "Widget A", userName: "alice", quantity: 1, priceAtOrder: 1000, paymentMethod: "Cash", saleDate: "2024-01-01" },
  { productName: "Widget B", userName: "bob", quantity: 2, priceAtOrder: 2000, paymentMethod: "BTC", saleDate: "2024-01-02" },
];

const formatCurrency = (cents) => `$${cents}`;

describe("SalesDetailCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    mockUseSalesData = {
      paginatedSales: [],
      totalPages: 1,
      page: 1,
      setPage: mockSetPage,
      rowsPerPage: 10,
      handleRowsPerPageChange: mockHandleRowsPerPage,
      exportToCsv: mockExportToCsv,
    };
  });

  it("renders the transactions title", () => {
    render(<SalesDetailCard sales={SALES} formatCurrency={formatCurrency} />);
    expect(screen.getByText("sales.transactions")).toBeInTheDocument();
  });

  it("shows record count of filtered sales", () => {
    render(<SalesDetailCard sales={SALES} formatCurrency={formatCurrency} />);
    expect(screen.getByText(/2 sales\.records/)).toBeInTheDocument();
  });

  it("export button is disabled when sales is empty", () => {
    render(<SalesDetailCard sales={[]} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("export-button")).toBeDisabled();
  });

  it("export button is enabled when sales has data", () => {
    render(<SalesDetailCard sales={SALES} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("export-button")).not.toBeDisabled();
  });

  it("export button calls exportToCsv", () => {
    render(<SalesDetailCard sales={SALES} formatCurrency={formatCurrency} />);
    fireEvent.click(screen.getByTestId("export-button"));
    expect(mockExportToCsv).toHaveBeenCalledTimes(1);
  });

  it("does not render Pagination when totalPages is 1", () => {
    render(<SalesDetailCard sales={SALES} formatCurrency={formatCurrency} />);
    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });

  it("renders Pagination when totalPages > 1", () => {
    mockUseSalesData = { ...mockUseSalesData, totalPages: 3, page: 1 };
    render(<SalesDetailCard sales={SALES} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  it("renders SalesFilters and SalesList", () => {
    render(<SalesDetailCard sales={SALES} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("sales-filters")).toBeInTheDocument();
    expect(screen.getByTestId("sales-list")).toBeInTheDocument();
  });
});
