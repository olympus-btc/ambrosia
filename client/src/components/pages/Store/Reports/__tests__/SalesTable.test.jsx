import { render, screen } from "@testing-library/react";

import { SalesTable } from "../components/SalesTable";

jest.mock("../components/PaymentBadge", () => ({
  PaymentBadge: ({ method }) => <span data-testid="payment-badge">{method}</span>,
}));

jest.mock("@heroui/react", () => {
  const Card = ({ children, ...props }) => <div {...props}>{children}</div>;
  const CardBody = ({ children, className }) => <div className={className}>{children}</div>;
  return { Card, CardBody };
});

const mockFormatCurrency = jest.fn((cents) => `$${cents / 100}`);

describe("SalesTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── estado vacío ─────────────────────────────────────────────────────────

  it("renderiza estado vacío cuando sales es array vacío", () => {
    render(<SalesTable sales={[]} formatCurrency={mockFormatCurrency} />);
    expect(screen.getByText("sales.empty")).toBeInTheDocument();
  });

  it("renderiza estado vacío cuando sales es undefined", () => {
    render(<SalesTable sales={undefined} formatCurrency={mockFormatCurrency} />);
    expect(screen.getByText("sales.empty")).toBeInTheDocument();
  });

  it("no renderiza items cuando la lista está vacía", () => {
    render(<SalesTable sales={[]} formatCurrency={mockFormatCurrency} />);
    expect(screen.queryByTestId("payment-badge")).not.toBeInTheDocument();
  });

  // ─── renderizado de items ─────────────────────────────────────────────────

  it("renderiza el nombre del producto y del usuario", () => {
    const sales = [
      {
        productName: "Raspberry Pi",
        quantity: 2,
        priceAtOrder: 2500,
        userName: "alice",
        paymentMethod: "Cash",
        saleDate: "2024-06-15 10:30:00",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText("Raspberry Pi")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("renderiza la cantidad con prefijo ×", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 5,
        priceAtOrder: 1000,
        userName: "bob",
        paymentMethod: "BTC",
        saleDate: "2024-01-01 00:00:00",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText("×5")).toBeInTheDocument();
  });

  it("llama a formatCurrency con priceAtOrder para el precio unitario", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 3,
        priceAtOrder: 1500,
        userName: "carlos",
        paymentMethod: "Cash",
        saleDate: "2024-01-01 00:00:00",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(mockFormatCurrency).toHaveBeenCalledWith(1500);
  });

  it("llama a formatCurrency con priceAtOrder * quantity para el total de línea", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 3,
        priceAtOrder: 1500,
        userName: "carlos",
        paymentMethod: "Cash",
        saleDate: "2024-01-01 00:00:00",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    // total = 1500 * 3 = 4500
    expect(mockFormatCurrency).toHaveBeenCalledWith(4500);
  });

  it("muestra el badge de método de pago", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 1,
        priceAtOrder: 500,
        userName: "diana",
        paymentMethod: "BTC",
        saleDate: "2024-01-01 00:00:00",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByTestId("payment-badge")).toHaveTextContent("BTC");
  });

  it("renderiza múltiples items de venta", () => {
    const sales = [
      { productName: "Prod A", quantity: 1, priceAtOrder: 100, userName: "u1", paymentMethod: "Cash", saleDate: "2024-01-01 00:00:00" },
      { productName: "Prod B", quantity: 2, priceAtOrder: 200, userName: "u2", paymentMethod: "BTC", saleDate: "2024-01-02 00:00:00" },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText("Prod A")).toBeInTheDocument();
    expect(screen.getByText("Prod B")).toBeInTheDocument();
  });

  // ─── renderizado de fecha ─────────────────────────────────────────────────

  it("renderiza la fecha de venta usando la API nativa del browser", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 1,
        priceAtOrder: 500,
        userName: "test",
        paymentMethod: "Cash",
        saleDate: "2024-06-15T10:30:00",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    // Verifica que se renderiza una fecha que contiene el año — el formato exacto
    // lo determina el locale del browser (no hardcodeado).
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("muestra guion cuando saleDate es null", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 1,
        priceAtOrder: 500,
        userName: "test",
        paymentMethod: "Cash",
        saleDate: null,
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("muestra guion cuando saleDate es cadena vacía", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 1,
        priceAtOrder: 500,
        userName: "test",
        paymentMethod: "Cash",
        saleDate: "",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
