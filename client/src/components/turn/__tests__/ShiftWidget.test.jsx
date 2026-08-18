import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockAddToast = jest.fn();
jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  addToast: (...toastArguments) => mockAddToast(...toastArguments),
}));

jest.mock("@/hooks/turn/useTurn", () => ({
  useTurn: jest.fn(),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: jest.fn(),
}));

jest.mock("@/components/turn/CloseTurnModal", () => ({
  CloseTurnModal: ({ isOpen, onConfirm, onClose }) => (isOpen ? (
    <div data-testid="close-turn-modal">
      <button onClick={() => onConfirm(150, -10)}>confirm-close</button>
      <button onClick={onClose}>cancel-close</button>
    </div>
  ) : null),
}));

import { useCurrency } from "@/components/hooks/useCurrency";
import { useTurn } from "@/hooks/turn/useTurn";

import { ShiftWidget } from "../ShiftWidget";

const mockCloseShift = jest.fn();
const mockFormatAmount = jest.fn((cents) => `$${(cents / 100).toFixed(2)}`);

const SHIFT_DATA = {
  id: 1,
  shiftDate: "2026-03-04",
  startTime: "09:00:00",
  initialAmount: 100,
};

function setupMocks({
  openTurn = 1,
  openShiftData = SHIFT_DATA,
  totalBalance = 250,
  totalTickets = 5,
  ticketsLoading = false,
} = {}) {
  useTurn.mockReturnValue({
    openTurn,
    openShiftData,
    closeShift: mockCloseShift,
    totalBalance,
    totalTickets,
    ticketsLoading,
  });
  useCurrency.mockReturnValue({ formatAmount: mockFormatAmount });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ShiftWidget", () => {
  describe("when no shift is open", () => {
    it("renders nothing", () => {
      setupMocks({ openTurn: null });
      const { container } = render(<ShiftWidget />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("when a shift is open", () => {
    it("renders the pill button", () => {
      setupMocks();
      render(<ShiftWidget />);
      expect(screen.getByRole("button", { name: /shiftActive/ })).toBeInTheDocument();
    });

    it("does not show the detail panel initially", () => {
      setupMocks();
      render(<ShiftWidget />);
      expect(screen.queryByText(/shiftOpenedAt/)).not.toBeInTheDocument();
    });
  });

  describe("expanding the panel", () => {
    async function renderExpanded(overrides = {}) {
      const user = userEvent.setup();
      setupMocks(overrides);
      render(<ShiftWidget />);
      await user.click(screen.getByRole("button", { name: /shiftActive/ }));
      return user;
    }

    it("shows shift date and time", async () => {
      await renderExpanded();
      expect(screen.getByText(/2026-03-04/)).toBeInTheDocument();
      expect(screen.getByText(/09:00:00/)).toBeInTheDocument();
    });

    it("calls formatAmount with totalBalance in cents", async () => {
      await renderExpanded({ totalBalance: 250 });
      expect(mockFormatAmount).toHaveBeenCalledWith(25000);
    });

    it("shows totalTickets count", async () => {
      await renderExpanded({ totalTickets: 7 });
      expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("shows loading placeholder while tickets are loading", async () => {
      await renderExpanded({ ticketsLoading: true });
      expect(screen.getAllByText("…")).toHaveLength(2);
    });

    it("collapses panel when pill is clicked again", async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<ShiftWidget />);
      const pill = screen.getByRole("button", { name: /shiftActive/ });

      await user.click(pill);
      expect(screen.getByText(/shiftOpenedAt/)).toBeInTheDocument();

      await user.click(pill);
      await waitFor(() => {
        expect(screen.queryByText(/shiftOpenedAt/)).not.toBeInTheDocument();
      });
    });
  });

  describe("closing a shift", () => {
    it("opens CloseTurnModal when close button is pressed", async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<ShiftWidget />);
      await user.click(screen.getByRole("button", { name: /shiftActive/ }));
      await user.click(screen.getByText("closeShiftButton"));
      expect(screen.getByTestId("close-turn-modal")).toBeInTheDocument();
    });

    it("calls closeShift with finalAmount and difference from modal", async () => {
      const user = userEvent.setup();
      mockCloseShift.mockResolvedValue(true);
      setupMocks();
      render(<ShiftWidget />);
      await user.click(screen.getByRole("button", { name: /shiftActive/ }));
      await user.click(screen.getByText("closeShiftButton"));
      await user.click(screen.getByText("confirm-close"));
      expect(mockCloseShift).toHaveBeenCalledWith(150, -10);
    });

    it("closes modal after confirming close", async () => {
      const user = userEvent.setup();
      mockCloseShift.mockResolvedValue(true);
      setupMocks();
      render(<ShiftWidget />);
      await user.click(screen.getByRole("button", { name: /shiftActive/ }));
      await user.click(screen.getByText("closeShiftButton"));
      await user.click(screen.getByText("confirm-close"));
      await waitFor(() => {
        expect(screen.queryByTestId("close-turn-modal")).not.toBeInTheDocument();
      });
    });

    it("collapses panel after confirming close", async () => {
      const user = userEvent.setup();
      mockCloseShift.mockResolvedValue(true);
      setupMocks();
      render(<ShiftWidget />);
      await user.click(screen.getByRole("button", { name: /shiftActive/ }));
      await user.click(screen.getByText("closeShiftButton"));
      await user.click(screen.getByText("confirm-close"));
      await waitFor(() => {
        expect(screen.queryByText(/shiftOpenedAt/)).not.toBeInTheDocument();
      });
    });

    it("shows a success toast after closing the shift", async () => {
      const user = userEvent.setup();
      mockCloseShift.mockResolvedValue(true);
      setupMocks();
      render(<ShiftWidget />);
      await user.click(screen.getByRole("button", { name: /shiftActive/ }));
      await user.click(screen.getByText("closeShiftButton"));
      await user.click(screen.getByText("confirm-close"));

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "success", description: "closeShiftSuccess" }),
      );
    });

    it("shows an error toast when closeShift fails", async () => {
      const user = userEvent.setup();
      mockCloseShift.mockRejectedValue(new Error("Server error"));
      setupMocks();
      render(<ShiftWidget />);
      await user.click(screen.getByRole("button", { name: /shiftActive/ }));
      await user.click(screen.getByText("closeShiftButton"));
      await user.click(screen.getByText("confirm-close"));

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({ color: "danger", description: "Server error" }),
        );
      });
    });

    it("keeps the close modal open when closeShift fails", async () => {
      const user = userEvent.setup();
      mockCloseShift.mockRejectedValue(new Error("Server error"));
      setupMocks();
      render(<ShiftWidget />);
      await user.click(screen.getByRole("button", { name: /shiftActive/ }));
      await user.click(screen.getByText("closeShiftButton"));
      await user.click(screen.getByText("confirm-close"));

      await waitFor(() => {
        expect(screen.getByTestId("close-turn-modal")).toBeInTheDocument();
      });
    });

    it("does not call closeShift twice while close is pending", async () => {
      const user = userEvent.setup();
      let resolveCloseShift;
      mockCloseShift.mockReturnValue(new Promise((resolveShiftClose) => { resolveCloseShift = resolveShiftClose; }));
      setupMocks();
      render(<ShiftWidget />);
      await user.click(screen.getByRole("button", { name: /shiftActive/ }));
      await user.click(screen.getByText("closeShiftButton"));

      await user.click(screen.getByText("confirm-close"));
      await user.click(screen.getByText("confirm-close"));

      expect(mockCloseShift).toHaveBeenCalledTimes(1);

      resolveCloseShift(true);
      await waitFor(() => {
        expect(screen.queryByTestId("close-turn-modal")).not.toBeInTheDocument();
      });
    });

    it("dismisses modal without closing shift on cancel", async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<ShiftWidget />);
      await user.click(screen.getByRole("button", { name: /shiftActive/ }));
      await user.click(screen.getByText("closeShiftButton"));
      await user.click(screen.getByText("cancel-close"));
      expect(mockCloseShift).not.toHaveBeenCalled();
      expect(screen.queryByTestId("close-turn-modal")).not.toBeInTheDocument();
    });
  });
});
