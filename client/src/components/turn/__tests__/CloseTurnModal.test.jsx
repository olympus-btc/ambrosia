import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/hooks/turn/useShiftTickets", () => ({
  useShiftTickets: jest.fn(),
}));

jest.mock("@/components/pages/Store/hooks/usePrinter", () => ({
  usePrinters: jest.fn(),
}));

import { usePrinters } from "@/components/pages/Store/hooks/usePrinter";
import { useShiftTickets } from "@/hooks/turn/useShiftTickets";

import { CloseTurnModal } from "../CloseTurnModal";

const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;

const SHIFT_DATA = {
  id: 1,
  shift_date: "2026-03-04",
  start_time: "09:00:00",
  initial_amount: 100,
};

function setupMocks({
  totalBalance = 250,
  totalTickets = 5,
  byPaymentMethod = [],
  loading = false,
  printerConfigs = [],
  loadingConfigs = false,
} = {}) {
  useShiftTickets.mockReturnValue({ totalBalance, totalTickets, byPaymentMethod, loading });
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
    it("does not pass shiftData to useShiftTickets when isOpen=false", () => {
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
      expect(useShiftTickets).toHaveBeenCalledWith(null);
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

    it("passes shiftData to useShiftTickets when isOpen=true", () => {
      renderModal();
      expect(useShiftTickets).toHaveBeenCalledWith(SHIFT_DATA);
    });
  });

  describe("loading state", () => {
    it("shows loading text and hides summary card while tickets load", () => {
      setupMocks({ loading: true });
      renderModal();
      expect(screen.getByText("close.confirming")).toBeInTheDocument();
      expect(screen.queryByText("totalSales")).not.toBeInTheDocument();
    });

    it("shows totalBalance and totalTickets once loaded", () => {
      setupMocks({ totalBalance: 250, totalTickets: 5, loading: false });
      renderModal();
      expect(screen.queryByText("close.confirming")).not.toBeInTheDocument();
      expect(screen.getAllByText("$250.00").length).toBeGreaterThan(0);
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  describe("financial summary", () => {
    it("shows initialAmountLabel with formatted value", () => {
      setupMocks({ totalBalance: 250, loading: false });
      renderModal();
      // initialAmount=100 → $100.00
      expect(screen.getByText("$100.00")).toBeInTheDocument();
    });

    it("shows expectedTotal = initialAmount + totalBalance", () => {
      setupMocks({ totalBalance: 250, loading: false });
      renderModal();
      // expectedTotal = 100 + 250 = 350 → $350.00
      expect(screen.getByText("$350.00")).toBeInTheDocument();
    });

    it("shows payment method breakdown when available", () => {
      setupMocks({
        totalBalance: 300,
        loading: false,
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
      setupMocks({ byPaymentMethod: [], loading: false });
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
      // With finalAmount=0, initialAmount=100, totalBalance=250:
      // expectedTotal = 350, difference = 0 - 350 = -350
      setupMocks({ totalBalance: 250, loading: false });
      renderModal({ onConfirm });
      await user.click(screen.getByText("close.confirm"));
      expect(onConfirm).toHaveBeenCalledWith(0, -350);
    });

    it("disables confirm button while confirmLoading=true", () => {
      renderModal({ confirmLoading: true });
      const confirmBtn = screen.getByRole("button", { name: /close\.confirming/ });
      expect(confirmBtn).toBeDisabled();
    });
  });

  describe("printer integration", () => {
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

    it("calls printTicket with corte-z ticket data on print", async () => {
      const user = userEvent.setup();
      const printTicket = jest.fn().mockResolvedValue(undefined);
      const byPaymentMethod = [{ name: "Cash", total: 100 }];
      setupMocks({
        totalBalance: 100,
        loading: false,
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
