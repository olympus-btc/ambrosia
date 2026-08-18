import { render, screen, fireEvent } from "@testing-library/react";

import { LightningCardUnlocked } from "../LightningCardUnlocked";

jest.mock("@heroui/react", () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Spinner: ({ size, color }) => <div data-testid="spinner" data-size={size} data-color={color} />,
  Switch: ({ isSelected, isDisabled, onValueChange }) => (
    <button
      role="switch"
      aria-checked={isSelected}
      disabled={isDisabled}
      onClick={() => onValueChange && onValueChange(!isSelected)}
    />
  ),
}));

jest.mock("@components/auth/WalletGuard", () => function MockWalletGuard({ children, onAuthorized, onCancel, title, passwordLabel, confirmText, cancelText }) {
  return (
    <div>
      <span data-testid="guard-title">{title}</span>
      <span data-testid="guard-password-label">{passwordLabel}</span>
      <button type="button" data-testid="guard-confirm" onClick={onAuthorized}>{confirmText}</button>
      <button type="button" data-testid="guard-cancel" onClick={onCancel}>{cancelText}</button>
      {children}
    </div>
  );
},
);

jest.mock("lucide-react", () => ({
  AlertTriangle: () => <svg data-testid="icon-alert" />,
}));

const translate = (key) => key;

function renderUnlocked(props = {}) {
  return render(
    <LightningCardUnlocked
      enabled={false}
      loading={false}
      restarting={false}
      onToggle={jest.fn()}
      onAuthorized={jest.fn()}
      onHide={jest.fn()}
      lightningCardTranslations={translate}
      {...props}
    />,
  );
}

describe("LightningCardUnlocked", () => {
  describe("Loading state (loading=true)", () => {
    it("renders the spinner", () => {
      renderUnlocked({ loading: true });
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });

    it("does not render the switch", () => {
      renderUnlocked({ loading: true });
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    });
  });

  describe("Loaded state (loading=false)", () => {
    it("does not render the spinner", () => {
      renderUnlocked();
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });

    it("renders switch in off state when enabled=false", () => {
      renderUnlocked({ enabled: false });
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    });

    it("renders switch in on state when enabled=true", () => {
      renderUnlocked({ enabled: true });
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    });

    it("shows warning text when enabled=true", () => {
      renderUnlocked({ enabled: true });
      expect(screen.getByText(/autoLiquidityWarning/)).toBeInTheDocument();
    });

    it("does not show warning text when enabled=false", () => {
      renderUnlocked({ enabled: false });
      expect(screen.queryByText(/autoLiquidityWarning/)).not.toBeInTheDocument();
    });

    it("shows restarting text when restarting=true", () => {
      renderUnlocked({ restarting: true });
      expect(screen.getByText("restarting")).toBeInTheDocument();
    });

    it("does not show restarting text when restarting=false", () => {
      renderUnlocked({ restarting: false });
      expect(screen.queryByText("restarting")).not.toBeInTheDocument();
    });

    it("disables switch when restarting=true", () => {
      renderUnlocked({ restarting: true });
      expect(screen.getByRole("switch")).toBeDisabled();
    });

    it("enables switch when restarting=false", () => {
      renderUnlocked({ restarting: false });
      expect(screen.getByRole("switch")).not.toBeDisabled();
    });
  });

  describe("Interaction", () => {
    it("calls onToggle when switch is clicked", () => {
      const onToggle = jest.fn();
      renderUnlocked({ enabled: false, onToggle });
      fireEvent.click(screen.getByRole("switch"));
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it("forwards onAuthorized to WalletGuard", () => {
      const onAuthorized = jest.fn();
      renderUnlocked({ onAuthorized });
      fireEvent.click(screen.getByTestId("guard-confirm"));
      expect(onAuthorized).toHaveBeenCalledTimes(1);
    });

    it("forwards onHide as onCancel to WalletGuard", () => {
      const onHide = jest.fn();
      renderUnlocked({ onHide });
      fireEvent.click(screen.getByTestId("guard-cancel"));
      expect(onHide).toHaveBeenCalledTimes(1);
    });
  });

  describe("WalletGuard props", () => {
    it("passes the modal title to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-title").textContent).toBe("modalTitle");
    });

    it("passes the password label to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-password-label").textContent).toBe("passwordLabel");
    });

    it("passes the confirm text to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-confirm").textContent).toBe("confirmButton");
    });

    it("passes the cancel text to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-cancel").textContent).toBe("cancelButton");
    });
  });
});
