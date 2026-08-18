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
    totalBalance, cashTotal, refundedCashTotal, totalTickets, byPaymentMethod, ticketsLoading, breakdownLoading,
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
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderModal({ onClose });
      await user.click(screen.getByText("close.cancel"));
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onConfirm with finalAmount=0 and computed difference", async () => {
      const user = userEvent.setup();
      const onConfirm = jest.fn();
      setupMocks({ totalBalance: 250, cashTotal: 180, ticketsLoading: false });
      renderModal({ onConfirm });
      await user.click(screen.getByText("close.confirm"));
      expect(onConfirm).toHaveBeenCalledWith(0, -280);
    });

    it("disables confirm button while confirmLoading=true", () => {
      renderModal({ confirmLoading: true });
      const confirmBtn = screen.getByRole("button", { name: /close\.confirming/ });
      expect(confirmBtn).toBeDisabled();
    });
  });

  describe("printer integration", () => {
    it("disables print button while breakdown is loading", () => {
      setupMocks({ printerConfigs: [{ printerType: "CUSTOMER", enabled: true }], loadingConfigs: false });
      useTurn.mockReturnValue({
        totalBalance: 250, totalTickets: 5, byPaymentMethod: [], ticketsLoading: false, breakdownLoading: true,
      });
      usePrinters.mockReturnValue({
        printTicket: jest.fn(),
        printerConfigs: [{ printerType: "CUSTOMER", enabled: true }],
        loadingConfigs: false,
      });
      renderModal();
      const printBtn = screen.getByText("printCorteZ").closest("button");
      expect(printBtn).toHaveAttribute("data-disabled", "true");
    });

    it("does not show print button when no customer printer is configured", () => {
      setupMocks({ printerConfigs: [], loadingConfigs: false });
      renderModal();
      expect(screen.queryByText("printCorteZ")).not.toBeInTheDocument();
    });

    it("does not show print button while printer configs are loading", () => {
      setupMocks({
        printerConfigs: [{ printerType: "CUSTOMER", enabled: true }],
        loadingConfigs: true,
      });
      renderModal();
      expect(screen.queryByText("printCorteZ")).not.toBeInTheDocument();
    });

    it("shows print button when a customer printer is enabled", () => {
      setupMocks({
        printerConfigs: [{ printerType: "CUSTOMER", enabled: true }],
        loadingConfigs: false,
      });
      renderModal();
      expect(screen.getByText("printCorteZ")).toBeInTheDocument();
    });

    it("shows error toast when printTicket fails", async () => {
      const user = userEvent.setup();
      const printTicket = jest.fn().mockRejectedValue(new Error("printer offline"));
      setupMocks({ printerConfigs: [{ printerType: "CUSTOMER", enabled: true }], loadingConfigs: false });
      usePrinters.mockReturnValue({
        printTicket,
        printerConfigs: [{ printerType: "CUSTOMER", enabled: true }],
        loadingConfigs: false,
      });
      renderModal();
      await user.click(screen.getByText("printCorteZ"));
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "printCorteZError" }),
      );
    });

    it("shows error toast when printTicket returns non-ok response", async () => {
      const user = userEvent.setup();
      const printTicket = jest.fn().mockResolvedValue({ ok: false, status: 500 });
      setupMocks({ printerConfigs: [{ printerType: "CUSTOMER", enabled: true }], loadingConfigs: false });
      usePrinters.mockReturnValue({
        printTicket,
        printerConfigs: [{ printerType: "CUSTOMER", enabled: true }],
        loadingConfigs: false,
      });
      renderModal();
      await user.click(screen.getByText("printCorteZ"));
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "printCorteZError" }),
      );
    });

    it("shows success toast when printTicket succeeds", async () => {
      const user = userEvent.setup();
      const printTicket = jest.fn().mockResolvedValue({ ok: true });
      setupMocks({ printerConfigs: [{ printerType: "CUSTOMER", enabled: true }], loadingConfigs: false });
      usePrinters.mockReturnValue({
        printTicket,
        printerConfigs: [{ printerType: "CUSTOMER", enabled: true }],
        loadingConfigs: false,
      });
      renderModal();
      await user.click(screen.getByText("printCorteZ"));
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "success", description: "printCorteZSuccess" }),
      );
    });

    it("does not print twice while printTicket is pending", async () => {
      const user = userEvent.setup();
      let resolvePrintTicket;
      const printTicket = jest.fn().mockReturnValue(new Promise((resolvePrint) => { resolvePrintTicket = resolvePrint; }));
      setupMocks({ printerConfigs: [{ printerType: "CUSTOMER", enabled: true }], loadingConfigs: false });
      usePrinters.mockReturnValue({
        printTicket,
        printerConfigs: [{ printerType: "CUSTOMER", enabled: true }],
        loadingConfigs: false,
      });
      renderModal();
      await user.click(screen.getByText("printCorteZ"));
      await user.click(screen.getByText("printCorteZ"));

      expect(printTicket).toHaveBeenCalledTimes(1);

      resolvePrintTicket({ ok: true });
      await screen.findByText("printCorteZ");
    });

    it("calls printTicket with corte-z ticket data on print", async () => {
      const user = userEvent.setup();
      const printTicket = jest.fn().mockResolvedValue({ ok: true });
      const byPaymentMethod = [{ name: "Cash", total: 100 }];
      setupMocks({
        totalBalance: 100,
        ticketsLoading: false,
        byPaymentMethod,
        printerConfigs: [{ printerType: "CUSTOMER", enabled: true }],
        loadingConfigs: false,
        printTicket,
      });
      usePrinters.mockReturnValue({
        printTicket,
        printerConfigs: [{ printerType: "CUSTOMER", enabled: true }],
        loadingConfigs: false,
      });
      renderModal();
      await user.click(screen.getByText("printCorteZ"));
      expect(printTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          printerType: "CUSTOMER",
          ticketData: expect.objectContaining({
            ticketId: "corte-z-2026-03-04",
            total: 100,
            items: [{ quantity: 1, name: "Cash", price: 100, comments: [] }],
          }),
        }),
      );
    });
  });
});
