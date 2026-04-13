import { addToast } from "@heroui/react";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";

import Reports from "../Reports";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFetchReport = jest.fn();
const mockUseReports = jest.fn();

jest.mock("../hooks/useReports", () => ({
  useReports: (...args) => mockUseReports(...args),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatAmount: (cents) => `$${cents}`,
    loading: false,
  }),
}));

jest.mock("../../StoreLayout", () => ({
  StoreLayout: ({ children }) => <div data-testid="store-layout">{children}</div>,
}));

jest.mock("../components/ReportsHeader", () => ({
  ReportsHeader: ({ onRefresh, loading }) => (
    <div>
      <button data-testid="refresh-btn" onClick={onRefresh}>refresh</button>
      {loading && <span data-testid="loading-indicator" />}
    </div>
  ),
}));

jest.mock("../components/ReportSkeleton", () => ({
  ReportSkeleton: () => <div data-testid="report-skeleton" />,
}));

// Stub con la nueva API: filters (objeto) + onFiltersChange (patch) + onClearFilters + onGenerate
jest.mock("../components/DateRangeCard", () => ({
  DateRangeCard: ({ filters, onFiltersChange, onClearFilters, onGenerate }) => (
    <div data-testid="date-range-card">
      <button data-testid="generate-btn" onClick={onGenerate}>generate</button>
      <button data-testid="clear-btn" onClick={onClearFilters}>clear</button>
      <button
        data-testid="period-week-btn"
        onClick={() => onFiltersChange({ activePeriod: "week", startDate: "", endDate: "" })}
      >
        week
      </button>
      <input
        data-testid="start-date-input"
        value={filters.startDate}
        onChange={(e) => onFiltersChange({ startDate: e.target.value, activePeriod: null })}
      />
      <input
        data-testid="end-date-input"
        value={filters.endDate}
        onChange={(e) => onFiltersChange({ endDate: e.target.value, activePeriod: null })}
      />
      <input
        data-testid="product-name-input"
        value={filters.productName}
        onChange={(e) => onFiltersChange({ productName: e.target.value })}
      />
      <input
        data-testid="payment-method-input"
        value={filters.paymentMethod}
        onChange={(e) => onFiltersChange({ paymentMethod: e.target.value })}
      />
      <span data-testid="active-period">{filters.activePeriod}</span>
    </div>
  ),
}));

jest.mock("../components/SalesTable", () => ({
  SalesTable: ({ sales }) => (
    <div data-testid="sales-table">
      {sales.map((s, i) => (
        <span key={i} data-testid="sale-item">{s.productName}</span>
      ))}
    </div>
  ),
}));

jest.mock("../components/SummaryStat", () => ({
  SummaryStat: ({ label, value }) => (
    <div data-testid="summary-stat">
      <span>{label}</span>
      <span data-testid="stat-value">{value}</span>
    </div>
  ),
}));

jest.mock("@heroui/react", () => {
  const Card = ({ children, className }) => <div className={className}>{children}</div>;
  const CardHeader = ({ children }) => <div>{children}</div>;
  const CardBody = ({ children }) => <div>{children}</div>;
  const addToast = jest.fn();
  return { Card, CardHeader, CardBody, addToast };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockReport = {
  totalRevenueCents: 15000,
  totalItemsSold: 7,
  sales: [
    { productName: "Widget A", quantity: 3, priceAtOrder: 1000, userName: "alice", paymentMethod: "Cash", saleDate: "2024-01-01" },
    { productName: "Widget B", quantity: 4, priceAtOrder: 3000, userName: "bob", paymentMethod: "BTC", saleDate: "2024-01-02" },
  ],
};

function makeHookReturn(overrides = {}) {
  return {
    reportData: null,
    loading: false,
    error: null,
    fetchReport: mockFetchReport,
    ...overrides,
  };
}

function renderReports() {
  return render(<Reports />);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Reports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchReport.mockResolvedValue(null);
    mockUseReports.mockReturnValue(makeHookReturn());
  });

  // ─── comportamiento inicial ────────────────────────────────────────────────

  it("auto-genera el reporte al montar el componente", async () => {
    renderReports();

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledTimes(1);
    });
  });

  it("auto-genera con period=month por defecto", async () => {
    renderReports();

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledWith(
        expect.objectContaining({ period: "month" }),
      );
    });
  });

  it("no auto-genera el reporte más de una vez al montar", async () => {
    renderReports();

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledTimes(1);
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetchReport).toHaveBeenCalledTimes(1);
  });

  it("renderiza el layout base sin datos de reporte", async () => {
    renderReports();

    expect(screen.getByTestId("store-layout")).toBeInTheDocument();
    expect(screen.getByTestId("date-range-card")).toBeInTheDocument();
  });

  // ─── datos del reporte ─────────────────────────────────────────────────────

  it("muestra los datos del reporte cuando reportData no es null", () => {
    mockUseReports.mockReturnValue(makeHookReturn({ reportData: mockReport }));
    renderReports();

    expect(screen.getByTestId("sales-table")).toBeInTheDocument();
    expect(screen.getAllByTestId("sale-item")).toHaveLength(2);
  });

  it("muestra toast de éxito al pulsar generate", async () => {
    mockFetchReport.mockResolvedValue(mockReport);
    renderReports();

    await act(async () => {
      fireEvent.click(screen.getByTestId("generate-btn"));
    });

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "success" }),
      );
    });
  });

  it("no muestra SalesTable cuando reportData es null", () => {
    renderReports();

    expect(screen.queryByTestId("sales-table")).not.toBeInTheDocument();
  });

  // ─── manejo de errores ─────────────────────────────────────────────────────

  it("muestra toast de error cuando fetchReport lanza excepción al generar", async () => {
    mockFetchReport.mockResolvedValueOnce(null); // auto-fetch ok
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    mockFetchReport.mockRejectedValueOnce(new Error("Network error"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("generate-btn"));
    });

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger" }),
      );
    });
  });

  it("muestra el banner de error cuando el hook expone error", () => {
    mockUseReports.mockReturnValue(makeHookReturn({ error: new Error("fail") }));
    renderReports();

    // El banner de error usa AlertCircle — verificamos que está en el DOM
    // buscando por la clase de color rojo en el card
    const redCards = document.querySelectorAll(".bg-red-50");
    expect(redCards.length).toBeGreaterThan(0);
  });

  // ─── validateCustomRange ──────────────────────────────────────────────────

  it("no genera reporte cuando startDate > endDate", async () => {
    mockFetchReport.mockResolvedValueOnce(null);
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    await act(async () => {
      fireEvent.change(screen.getByTestId("start-date-input"), {
        target: { value: "2024-12-31" },
      });
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId("end-date-input"), {
        target: { value: "2024-01-01" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("generate-btn"));
    });

    expect(mockFetchReport).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ color: "danger" }),
    );
  });

  it("no genera reporte cuando solo se proporciona startDate", async () => {
    mockFetchReport.mockResolvedValueOnce(null);
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    await act(async () => {
      fireEvent.change(screen.getByTestId("start-date-input"), {
        target: { value: "2024-01-01" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("generate-btn"));
    });

    expect(mockFetchReport).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ color: "danger" }),
    );
  });

  it("no genera reporte cuando solo se proporciona endDate", async () => {
    mockFetchReport.mockResolvedValueOnce(null);
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    await act(async () => {
      fireEvent.change(screen.getByTestId("end-date-input"), {
        target: { value: "2024-12-31" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("generate-btn"));
    });

    expect(mockFetchReport).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ color: "danger" }),
    );
  });

  it("genera reporte sin filtros cuando no hay period ni fechas personalizadas", async () => {
    mockFetchReport.mockResolvedValue(null);
    renderReports();
    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();

    // Activar fechas para quitar el period, luego borrarlas
    await act(async () => {
      fireEvent.change(screen.getByTestId("start-date-input"), {
        target: { value: "2024-01-01" },
      });
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId("start-date-input"), {
        target: { value: "" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("generate-btn"));
    });

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledWith(
        expect.objectContaining({ period: undefined, startDate: undefined, endDate: undefined }),
      );
    });
  });

  // ─── handlePeriod ─────────────────────────────────────────────────────────

  it("handlePeriod establece el periodo activo y limpia las fechas", async () => {
    renderReports();

    await act(async () => {
      fireEvent.change(screen.getByTestId("start-date-input"), {
        target: { value: "2024-01-01" },
      });
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId("end-date-input"), {
        target: { value: "2024-01-31" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("period-week-btn"));
    });

    expect(screen.getByTestId("start-date-input").value).toBe("");
    expect(screen.getByTestId("end-date-input").value).toBe("");
    expect(screen.getByTestId("active-period")).toHaveTextContent("week");
  });

  // ─── handleClearFilters ────────────────────────────────────────────────────

  it("handleClearFilters restaura DEFAULT_PERIOD=month y vacía los filtros", async () => {
    renderReports();

    await act(async () => {
      fireEvent.change(screen.getByTestId("product-name-input"), {
        target: { value: "Widget" },
      });
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId("payment-method-input"), {
        target: { value: "BTC" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("clear-btn"));
    });

    expect(screen.getByTestId("active-period")).toHaveTextContent("month");
    expect(screen.getByTestId("product-name-input").value).toBe("");
    expect(screen.getByTestId("payment-method-input").value).toBe("");
    expect(screen.getByTestId("start-date-input").value).toBe("");
    expect(screen.getByTestId("end-date-input").value).toBe("");
  });

  // ─── refresh button ────────────────────────────────────────────────────────

  it("el botón de refresh vuelve a llamar a fetchReport", async () => {
    mockFetchReport.mockResolvedValue(null);
    renderReports();

    await waitFor(() => expect(mockFetchReport).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.click(screen.getByTestId("refresh-btn"));
    });

    await waitFor(() => {
      expect(mockFetchReport).toHaveBeenCalledTimes(2);
    });
  });
});
