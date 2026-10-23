import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockAddToast = jest.fn();
jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  addToast: (...args) => mockAddToast(...args),
}));

jest.mock("@/hooks/turn/useTurn", () => ({
  useTurn: jest.fn(),
}));

jest.mock("@/components/pages/Store/hooks/usePrinter", () => ({
  usePrinters: jest.fn(),
}));

import { usePrinters } from "@/components/pages/Store/hooks/usePrinter";
import { useTurn } from "@/hooks/turn/useTurn";

import { CloseTurnModal } from "../CloseTurnModal";

const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;

const SHIFT_DATA = {
  id: 1,
  shiftDate: "2026-03-04",
  startTime: "09:00:00",
  initialAmount: 100,
};

function setupMocks({
  totalBalance = 250,
  totalTips = 0,
  cashTotal = totalBalance,
  refundedCashTotal = 0,
  totalTickets = 5,
  byPaymentMethod = [],
  ticketsLoading = false,
  breakdownLoading = false,
  printerConfigs = [],
  loadingConfigs = false,
} = {}) {
  useTurn.mockReturnValue({
    totalBalance, totalTips, cashTotal, refundedCashTotal, totalTickets, byPaymentMethod, ticketsLoading, breakdownLoading,
  });
  usePrinters.mockReturnValue({ printTicket: jest.fn(), printerConfigs, loadingConfigs });
}

function renderModal(props = {}) {
  return render(
    <CloseTurnModal
      isOpen
      onClose={jest.fn()}
      onConfirm={jest.fn()}
      shiftData={SHIFT_DATA}
      formatCurrency={formatCurrency}
      confirmLoading={false}
      {...props}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
});

describe("CloseTurnModal", () => {
  describe("when closed", () => {
    it("does not render modal content when isOpen=false", () => {
      setupMocks();
      render(
        <CloseTurnModal
          isOpen={false}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
          shiftData={SHIFT_DATA}
          formatCurrency={formatCurrency}
        />,
      );
      expect(screen.queryByText("close.modalTitle")).not.toBeInTheDocument();
    });
  });

  describe("when open", () => {
    it("shows modal title", () => {
      renderModal();
      expect(screen.getByText("close.modalTitle")).toBeInTheDocument();
    });

    it("shows shift period (date and time)", () => {
      renderModal();
      expect(screen.getByText("2026-03-04 09:00:00")).toBeInTheDocument();
    });

    it("shows modal title when isOpen=true", () => {
      renderModal();
      expect(screen.getByText("close.modalTitle")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows loading text and hides summary card while tickets load", () => {
      setupMocks({ ticketsLoading: true });
      renderModal();
      expect(screen.getByText("close.confirming")).toBeInTheDocument();
      expect(screen.queryByText("totalSales")).not.toBeInTheDocument();
    });

    it("shows totalBalance and totalTickets once loaded", () => {
      setupMocks({ totalBalance: 250, totalTickets: 5, ticketsLoading: false });
      renderModal();
      expect(screen.queryByText("close.confirming")).not.toBeInTheDocument();
      expect(screen.getAllByText("$250.00").length).toBeGreaterThan(0);
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  describe("financial summary", () => {
    it("shows initialAmountLabel with formatted value", () => {
      setupMocks({ totalBalance: 250, ticketsLoading: false });
      renderModal();
      expect(screen.getByText("$100.00")).toBeInTheDocument();
    });

    it("shows expectedTotal = initialAmount + cashTotal, not totalBalance", () => {
      setupMocks({ totalBalance: 250, cashTotal: 180, ticketsLoading: false });
      renderModal();
      expect(screen.getByText("$280.00")).toBeInTheDocument();
      expect(screen.queryByText("$350.00")).not.toBeInTheDocument();
    });

    it("shows cashSales line with the cashTotal value", () => {
      setupMocks({ totalBalance: 250, cashTotal: 180, ticketsLoading: false });
      renderModal();
      expect(screen.getByText("cashSales")).toBeInTheDocument();
      expect(screen.getByText("+ $180.00")).toBeInTheDocument();
    });

    it("shows cashRefunds line and subtracts it from expectedTotal", () => {
      setupMocks({ totalBalance: 300, cashTotal: 180, refundedCashTotal: 30, ticketsLoading: false });
      renderModal();
      expect(screen.getByText("cashRefunds")).toBeInTheDocument();
      expect(screen.getByText("- $30.00")).toBeInTheDocument();
      expect(screen.getByText("$250.00")).toBeInTheDocument();
      expect(screen.queryByText("$280.00")).not.toBeInTheDocument();
    });

    it("rounds the difference to the nearest cent so floating-point residue doesn't show as a discrepancy", () => {
      setupMocks({ cashTotal: 0.001, refundedCashTotal: 0, ticketsLoading: false });
      renderModal({ shiftData: { ...SHIFT_DATA, initialAmount: 0 } });
      const differenceRow = screen.getByText("difference").closest("div");
      expect(differenceRow.className).toContain("text-green-600");
      expect(differenceRow.className).not.toContain("text-red-600");
    });

    it("hides summary card while breakdown is loading even if tickets finished loading", () => {
      setupMocks({ ticketsLoading: false, breakdownLoading: true });
      renderModal();
      expect(screen.queryByText("expectedTotal")).not.toBeInTheDocument();
    });

    it("shows payment method breakdown when available", () => {
      setupMocks({
        totalBalance: 300,
        ticketsLoading: false,
        byPaymentMethod: [
          { name: "Efectivo", total: 200 },
          { name: "Tarjeta", total: 100 },
        ],
      });
      renderModal();
      expect(screen.getByText("Efectivo")).toBeInTheDocument();
      expect(screen.getByText("Tarjeta")).toBeInTheDocument();
    });

    it("hides payment breakdown section when byPaymentMethod is empty", () => {
      setupMocks({ byPaymentMethod: [], ticketsLoading: false });
      renderModal();
      expect(screen.queryByText("byPaymentMethod")).not.toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("calls onClose when cancel button is pressed", async () => {
      const cashier = userEvent.setup();
      const onClose = jest.fn();
      renderModal({ onClose });
      await cashier.click(screen.getByText("close.cancel"));
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onConfirm with finalAmount=0 and computed difference", async () => {
      const cashier = userEvent.setup();
      const onConfirm = jest.fn();
      setupMocks({ totalBalance: 250, cashTotal: 180, ticketsLoading: false });
      renderModal({ onConfirm });
      await cashier.click(screen.getByText("close.confirm"));
      expect(onConfirm).toHaveBeenCalledWith(0, -280, false);
    });

    it("disables confirm button while confirmLoading=true", () => {
      renderModal({ confirmLoading: true });
      const confirmBtn = screen.getByRole("button", { name: /close\.confirming/ });
      expect(confirmBtn).toBeDisabled();
    });
  });

  describe("printer integration", () => {
    it("does not offer to print the Z report when no customer printer is configured", () => {
      setupMocks({ printerConfigs: [], loadingConfigs: false });
      renderModal();
      expect(screen.queryByText("printCorteZOnClose")).not.toBeInTheDocument();
    });

    it("does not offer to print the Z report while printer configs are loading", () => {
      setupMocks({ printerConfigs: [{ printerType: "CUSTOMER", enabled: true }], loadingConfigs: true });
      renderModal();
      expect(screen.queryByText("printCorteZOnClose")).not.toBeInTheDocument();
    });

    it("asks to print the Z report when closing by default if a customer printer is enabled", async () => {
      const cashier = userEvent.setup();
      const onConfirm = jest.fn();
      setupMocks({ printerConfigs: [{ printerType: "CUSTOMER", enabled: true }] });
      renderModal({ onConfirm });

      expect(screen.getByRole("checkbox", { name: "printCorteZOnClose" })).toBeChecked();
      await cashier.click(screen.getByText("close.confirm"));

      expect(onConfirm).toHaveBeenCalledWith(0, -350, true);
    });

    it("does not ask to print the Z report when the checkbox is unchecked", async () => {
      const cashier = userEvent.setup();
      const onConfirm = jest.fn();
      setupMocks({ printerConfigs: [{ printerType: "CUSTOMER", enabled: true }] });
      renderModal({ onConfirm });

      await cashier.click(screen.getByRole("checkbox", { name: "printCorteZOnClose" }));
      await cashier.click(screen.getByText("close.confirm"));

      expect(onConfirm).toHaveBeenCalledWith(0, -350, false);
    });

    it("renders totalTips when totalTips is greater than zero", () => {
      setupMocks({ totalTips: 45 });
      renderModal();
      expect(screen.getAllByText("totalTips")).toHaveLength(2);
      expect(screen.getAllByText("$45.00")).toHaveLength(2);
    });

    it("renders totalTips as $0.00 in Z Report when totalTips is zero", () => {
      setupMocks({ totalTips: 0 });
      renderModal();
      expect(screen.getAllByText("totalTips")).toHaveLength(1);
      expect(screen.getAllByText("$0.00").length).toBeGreaterThanOrEqual(1);
    });
  });
});
