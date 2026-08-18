import { render, screen, waitFor } from "@testing-library/react";

jest.mock("@/hooks/auth/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1", userId: "user-1" } }),
}));

jest.mock("@/hooks/turn/useShiftTicketMetrics", () => ({
  useShiftTicketMetrics: jest.fn(),
}));

jest.mock("@/services/shiftsService", () => ({
  getTurnOpen: jest.fn(),
  openTurn: jest.fn(),
  closeTurn: jest.fn(),
}));

jest.mock("@/components/pages/Store/hooks/usePrinter", () => ({
  usePrinters: () => ({ printTicket: jest.fn(), printerConfigs: [], loadingConfigs: false }),
}));

jest.mock("@/hooks/turn/useTurn", () => jest.requireActual("../../../hooks/turn/useTurn"));

import { CloseTurnModal } from "@/components/turn/CloseTurnModal";
import { useShiftTicketMetrics } from "@/hooks/turn/useShiftTicketMetrics";
import { getTurnOpen } from "@/services/shiftsService";

import { TurnProvider } from "../TurnProvider";

const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;

const SHIFT_DATA = {
  id: "shift-1",
  shiftDate: "2026-03-04",
  startTime: "09:00:00",
  initialAmount: 100,
};

function renderCloseTurnModal() {
  return render(
    <TurnProvider>
      <CloseTurnModal
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        shiftData={SHIFT_DATA}
        formatCurrency={formatCurrency}
      />
    </TurnProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  getTurnOpen.mockResolvedValue(SHIFT_DATA);
});

describe("TurnProvider", () => {
  it("forwards totalBalance, cashTotal and byPaymentMethod from useShiftTicketMetrics to a real consumer", async () => {
    useShiftTicketMetrics.mockReturnValue({
      totalBalance: 130,
      cashTotal: 60,
      refundedCashTotal: 0,
      totalTickets: 11,
      byPaymentMethod: [{ name: "Cash", total: 60 }],
      ticketsLoading: false,
      breakdownLoading: false,
      refresh: jest.fn(),
      reset: jest.fn(),
    });

    renderCloseTurnModal();

    await waitFor(() => expect(screen.getByText("$160.00")).toBeInTheDocument());
    expect(screen.getByText("+ $130.00")).toBeInTheDocument();
    expect(screen.getByText("+ $60.00")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
  });

  it("does not fall back to totalBalance when cashTotal differs from it", async () => {
    useShiftTicketMetrics.mockReturnValue({
      totalBalance: 130,
      cashTotal: 60,
      refundedCashTotal: 0,
      totalTickets: 11,
      byPaymentMethod: [],
      ticketsLoading: false,
      breakdownLoading: false,
      refresh: jest.fn(),
      reset: jest.fn(),
    });

    renderCloseTurnModal();

    await waitFor(() => expect(screen.getByText("+ $60.00")).toBeInTheDocument());
    expect(screen.queryByText("$230.00")).not.toBeInTheDocument();
  });

  it("forwards refundedCashTotal from useShiftTicketMetrics and subtracts it from expectedTotal", async () => {
    useShiftTicketMetrics.mockReturnValue({
      totalBalance: 130,
      cashTotal: 60,
      refundedCashTotal: 20,
      totalTickets: 11,
      byPaymentMethod: [],
      ticketsLoading: false,
      breakdownLoading: false,
      refresh: jest.fn(),
      reset: jest.fn(),
    });

    renderCloseTurnModal();

    await waitFor(() => expect(screen.getByText("- $20.00")).toBeInTheDocument());
    expect(screen.getByText("$140.00")).toBeInTheDocument();
    expect(screen.queryByText("$160.00")).not.toBeInTheDocument();
  });
});
