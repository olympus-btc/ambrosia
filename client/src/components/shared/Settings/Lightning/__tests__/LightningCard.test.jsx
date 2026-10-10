import { render, screen, fireEvent, act } from "@testing-library/react";

import * as useAutoLiquidityHook from "@/hooks/useAutoLiquidity";

import { LightningCard } from "../LightningCard";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  CardFooter: ({ children }) => <div>{children}</div>,
  Spinner: () => <div data-testid="spinner" />,
  Switch: ({ isSelected, isDisabled, onValueChange }) => (
    <button
      role="switch"
      aria-checked={isSelected}
      disabled={isDisabled}
      onClick={() => onValueChange && onValueChange(!isSelected)}
    />
  ),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => Object.assign((key) => key, { raw: (key) => key }),
}));

jest.mock("@components/auth/WalletGuard", () => function MockWalletGuard({ children, onAuthorized, onCancel }) {
  return (
    <div data-testid="wallet-guard">
      <button type="button" data-testid="guard-confirm" onClick={onAuthorized}>confirm</button>
      <button type="button" data-testid="guard-cancel" onClick={onCancel}>cancel</button>
      {children}
    </div>
  );
},
);

jest.mock("lucide-react", () => ({
  AlertTriangle: () => <svg data-testid="icon-alert" />,
}));

const { addToast } = require("@heroui/react");

const mockLoadAutoLiquidity = jest.fn();
const mockToggleAutoLiquidity = jest.fn();

function mockHook(overrides = {}) {
  jest.spyOn(useAutoLiquidityHook, "useAutoLiquidity").mockReturnValue({
    enabled: false,
    loading: false,
    restarting: false,
    error: null,
    loadAutoLiquidity: mockLoadAutoLiquidity,
    toggleAutoLiquidity: mockToggleAutoLiquidity,
    ...overrides,
  });
}

function renderCard() {
  return render(<LightningCard />);
}

function openUnlocked() {
  fireEvent.click(screen.getByText("manageButton"));
}

async function openAndAuthorize() {
  openUnlocked();
  await act(async () => {
    fireEvent.click(screen.getByTestId("guard-confirm"));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadAutoLiquidity.mockResolvedValue(true);
});

describe("LightningCard", () => {
  describe("Initial (locked) state", () => {
    it("renders the locked card by default", () => {
      mockHook();
      renderCard();
      expect(screen.getByText("manageButton")).toBeInTheDocument();
    });

    it("does not render the WalletGuard before reveal", () => {
      mockHook();
      renderCard();
      expect(screen.queryByTestId("wallet-guard")).not.toBeInTheDocument();
    });
  });

  describe("Transition to unlocked state", () => {
    it("renders WalletGuard after the manage button is clicked", () => {
      mockHook();
      renderCard();
      openUnlocked();
      expect(screen.getByTestId("wallet-guard")).toBeInTheDocument();
    });

    it("hides the locked card after the manage button is clicked", () => {
      mockHook();
      renderCard();
      openUnlocked();
      expect(screen.queryByText("manageButton")).not.toBeInTheDocument();
    });
  });

  describe("onAuthorized — successful load", () => {
    it("calls load when WalletGuard confirms", async () => {
      mockLoadAutoLiquidity.mockResolvedValue(true);
      mockHook();
      renderCard();

      await openAndAuthorize();

      expect(mockLoadAutoLiquidity).toHaveBeenCalledTimes(1);
    });

    it("stays in unlocked state after a successful load", async () => {
      mockLoadAutoLiquidity.mockResolvedValue(true);
      mockHook();
      renderCard();

      await openAndAuthorize();

      expect(screen.getByTestId("wallet-guard")).toBeInTheDocument();
    });
  });

  describe("onAuthorized — not available under NWC", () => {
    it("shows a warning toast when load returns 'nwc'", async () => {
      mockLoadAutoLiquidity.mockResolvedValue("nwc");
      mockHook();
      renderCard();

      await openAndAuthorize();

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "warning", description: "notAvailableNwc" }),
      );
    });

    it("goes back to locked state when load returns 'nwc'", async () => {
      mockLoadAutoLiquidity.mockResolvedValue("nwc");
      mockHook();
      renderCard();

      await openAndAuthorize();

      expect(screen.getByText("manageButton")).toBeInTheDocument();
    });
  });

  describe("Hide (return to locked state)", () => {
    it("returns to locked state when WalletGuard cancel is pressed", () => {
      mockHook();
      renderCard();
      openUnlocked();
      fireEvent.click(screen.getByTestId("guard-cancel"));
      expect(screen.getByText("manageButton")).toBeInTheDocument();
    });
  });

  describe("Toggle interactions", () => {
    it("calls toggle when switch is clicked", async () => {
      mockToggleAutoLiquidity.mockResolvedValue(true);
      mockHook({ enabled: false });
      renderCard();

      await openAndAuthorize();
      await act(async () => {
        fireEvent.click(screen.getByRole("switch"));
      });

      expect(mockToggleAutoLiquidity).toHaveBeenCalledWith(true);
    });

    it("shows success toast when toggle returns true", async () => {
      mockToggleAutoLiquidity.mockResolvedValue(true);
      mockHook({ enabled: false });
      renderCard();

      await openAndAuthorize();
      await act(async () => {
        fireEvent.click(screen.getByRole("switch"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "success", description: "restartSuccess" }),
      );
    });

    it("shows warning toast when toggle returns 'manual'", async () => {
      mockToggleAutoLiquidity.mockResolvedValue("manual");
      mockHook({ enabled: false });
      renderCard();

      await openAndAuthorize();
      await act(async () => {
        fireEvent.click(screen.getByRole("switch"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "warning", description: "manualRestartRequired" }),
      );
    });

    it("shows danger toast when toggle returns false", async () => {
      mockToggleAutoLiquidity.mockResolvedValue(false);
      mockHook({ enabled: false });
      renderCard();

      await openAndAuthorize();
      await act(async () => {
        fireEvent.click(screen.getByRole("switch"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "restartError" }),
      );
    });

    it("shows a warning toast and returns to locked state when toggle returns 'nwc'", async () => {
      mockToggleAutoLiquidity.mockResolvedValue("nwc");
      mockHook({ enabled: false });
      renderCard();

      await openAndAuthorize();
      await act(async () => {
        fireEvent.click(screen.getByRole("switch"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "warning", description: "notAvailableNwc" }),
      );
      expect(screen.getByText("manageButton")).toBeInTheDocument();
    });
  });
});
