import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as useAutoLiquidityHook from "@/hooks/useAutoLiquidity";
import { I18nProvider } from "@i18n/I18nProvider";

import { LightningCard } from "../Lightning/LightningCard";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Card: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Switch: ({ isSelected, isDisabled, onValueChange }) => (
    <button
      role="switch"
      aria-checked={isSelected}
      disabled={isDisabled}
      onClick={() => onValueChange && onValueChange(!isSelected)}
    />
  ),
}));

const { addToast } = require("@heroui/react");

const mockToggle = jest.fn();

function mockHook(overrides = {}) {
  jest.spyOn(useAutoLiquidityHook, "useAutoLiquidity").mockReturnValue({
    enabled: false,
    loading: false,
    restarting: false,
    error: null,
    toggle: mockToggle,
    ...overrides,
  });
}

function renderCard() {
  return render(
    <I18nProvider>
      <LightningCard />
    </I18nProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("LightningCard", () => {
  describe("Rendering", () => {
    it("renders the title", () => {
      mockHook();
      renderCard();
      expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("renders the auto liquidity label", () => {
      mockHook();
      renderCard();
      expect(screen.getByText("autoLiquidityLabel")).toBeInTheDocument();
    });

    it("renders the description", () => {
      mockHook();
      renderCard();
      expect(screen.getByText("autoLiquidityDescription")).toBeInTheDocument();
    });

    it("renders switch in off state when enabled=false", () => {
      mockHook({ enabled: false });
      renderCard();
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    });

    it("renders switch in on state when enabled=true", () => {
      mockHook({ enabled: true });
      renderCard();
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    });

    it("shows warning text when enabled=true", () => {
      mockHook({ enabled: true });
      renderCard();
      expect(screen.getByText(/autoLiquidityWarning/)).toBeInTheDocument();
    });

    it("does not show warning text when enabled=false", () => {
      mockHook({ enabled: false });
      renderCard();
      expect(screen.queryByText(/autoLiquidityWarning/)).not.toBeInTheDocument();
    });

    it("shows restarting text when restarting=true", () => {
      mockHook({ restarting: true });
      renderCard();
      expect(screen.getByText("restarting")).toBeInTheDocument();
    });

    it("does not show restarting text when restarting=false", () => {
      mockHook({ restarting: false });
      renderCard();
      expect(screen.queryByText("restarting")).not.toBeInTheDocument();
    });

    it("disables switch when loading=true", () => {
      mockHook({ loading: true });
      renderCard();
      expect(screen.getByRole("switch")).toBeDisabled();
    });

    it("disables switch when restarting=true", () => {
      mockHook({ restarting: true });
      renderCard();
      expect(screen.getByRole("switch")).toBeDisabled();
    });

    it("enables switch when loading=false and restarting=false", () => {
      mockHook({ loading: false, restarting: false });
      renderCard();
      expect(screen.getByRole("switch")).not.toBeDisabled();
    });
  });

  describe("Toggle interactions", () => {
    it("calls toggle when switch is clicked", async () => {
      const user = userEvent.setup();
      mockToggle.mockResolvedValue(true);
      mockHook({ enabled: false });
      renderCard();

      await user.click(screen.getByRole("switch"));

      expect(mockToggle).toHaveBeenCalledWith(true);
    });

    it("shows success toast when toggle returns true", async () => {
      const user = userEvent.setup();
      mockToggle.mockResolvedValue(true);
      mockHook({ enabled: false });
      renderCard();

      await act(async () => {
        await user.click(screen.getByRole("switch"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "success", description: "restartSuccess" }),
      );
    });

    it("shows warning toast when toggle returns 'manual'", async () => {
      const user = userEvent.setup();
      mockToggle.mockResolvedValue("manual");
      mockHook({ enabled: false });
      renderCard();

      await act(async () => {
        await user.click(screen.getByRole("switch"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "warning", description: "manualRestartRequired" }),
      );
    });

    it("shows danger toast when toggle returns false", async () => {
      const user = userEvent.setup();
      mockToggle.mockResolvedValue(false);
      mockHook({ enabled: false });
      renderCard();

      await act(async () => {
        await user.click(screen.getByRole("switch"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "restartError" }),
      );
    });
  });
});
