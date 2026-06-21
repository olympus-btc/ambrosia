import { render, screen, fireEvent } from "@testing-library/react";

import { OrdersDetailCard } from "../OrdersDetailCard";

const mockExportToCsv = jest.fn();
const mockSetPage = jest.fn();
const mockHandleRowsPerPage = jest.fn();

let mockUseOrdersDetailData = {
  paginatedOrders: [],
  totalPages: 1,
  page: 1,
  setPage: mockSetPage,
  rowsPerPage: 10,
  handleRowsPerPageChange: mockHandleRowsPerPage,
  exportToCsv: mockExportToCsv,
};

jest.mock("../../hooks/useOrdersDetailData", () => ({
  useOrdersDetailData: () => mockUseOrdersDetailData,
}));

jest.mock("../OrdersFilters", () => ({
  OrdersFilters: () => <div data-testid="orders-filters" />,
}));

jest.mock("../OrdersList", () => ({
  ReportsOrdersList: () => <div data-testid="orders-list" />,
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

const ORDERS = [
  {
    orderId: "o1", shortId: "SH1", date: "2024-01-01", userName: "alice",
    paymentMethod: "Cash", total: 5000, itemCount: 2,
    items: [{ productName: "Widget A", quantity: 2 }],
  },
  {
    orderId: "o2", shortId: "SH2", date: "2024-01-02", userName: "bob",
    paymentMethod: "BTC", total: 3000, itemCount: 1,
    items: [{ productName: "Widget B", quantity: 1 }],
  },
];

const formatCurrency = (cents) => `$${cents}`;

describe("OrdersDetailCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    mockUseOrdersDetailData = {
      paginatedOrders: [],
      totalPages: 1,
      page: 1,
      setPage: mockSetPage,
      rowsPerPage: 10,
      handleRowsPerPageChange: mockHandleRowsPerPage,
      exportToCsv: mockExportToCsv,
    };
  });

  it("renders the orders title", () => {
    render(<OrdersDetailCard orders={ORDERS} formatCurrency={formatCurrency} />);
    expect(screen.getByText("orders.title")).toBeInTheDocument();
  });

  it("shows record count of filtered orders", () => {
    render(<OrdersDetailCard orders={ORDERS} formatCurrency={formatCurrency} />);
    expect(screen.getByText(/2 orders\.records/)).toBeInTheDocument();
  });

  it("export button is disabled when orders is empty", () => {
    render(<OrdersDetailCard orders={[]} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("export-button")).toBeDisabled();
  });

  it("export button is enabled when orders has data", () => {
    render(<OrdersDetailCard orders={ORDERS} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("export-button")).not.toBeDisabled();
  });

  it("export button calls exportToCsv", () => {
    render(<OrdersDetailCard orders={ORDERS} formatCurrency={formatCurrency} />);
    fireEvent.click(screen.getByTestId("export-button"));
    expect(mockExportToCsv).toHaveBeenCalledTimes(1);
  });

  it("does not render Pagination when totalPages is 1", () => {
    render(<OrdersDetailCard orders={ORDERS} formatCurrency={formatCurrency} />);
    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });

  it("renders Pagination when totalPages > 1", () => {
    mockUseOrdersDetailData = { ...mockUseOrdersDetailData, totalPages: 3, page: 1 };
    render(<OrdersDetailCard orders={ORDERS} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  it("renders OrdersFilters and ReportsOrdersList", () => {
    render(<OrdersDetailCard orders={ORDERS} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("orders-filters")).toBeInTheDocument();
    expect(screen.getByTestId("orders-list")).toBeInTheDocument();
  });
});
