import { render, screen, fireEvent } from "@testing-library/react";

import { SeedCardUnlocked } from "../Seed/SeedCardUnlocked";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Spinner: ({ size, color }) => <div data-testid="spinner" data-size={size} data-color={color} />,
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
  PenLine: () => <svg data-testid="icon-pen" />,
}));

const t = (key) => key;

const SEED = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

function renderUnlocked(props = {}) {
  return render(
    <SeedCardUnlocked
      seed={null}
      onAuthorized={jest.fn()}
      onHide={jest.fn()}
      t={t}
      {...props}
    />,
  );
}

describe("SeedCardUnlocked", () => {
  describe("Loading state (seed is null)", () => {
    it("renders the spinner when seed is null", () => {
      renderUnlocked();
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });

    it("does not render the words grid when seed is null", () => {
      renderUnlocked();
      expect(screen.queryByText("1.")).not.toBeInTheDocument();
    });

    it("does not render the paper note when seed is null", () => {
      renderUnlocked();
      expect(screen.queryByText("cardSeed.paperNote")).not.toBeInTheDocument();
    });

    it("does not render the hide button when seed is null", () => {
      renderUnlocked();
      expect(screen.queryByText("cardSeed.hideButton")).not.toBeInTheDocument();
    });
  });

  describe("Unlocked state (seed provided)", () => {
    it("does not render the spinner when seed is provided", () => {
      renderUnlocked({ seed: SEED });
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });

    it("renders all 12 seed words", () => {
      renderUnlocked({ seed: SEED });
      const words = SEED.split(" ");
      words.forEach((word) => {
        expect(screen.getAllByText(word).length).toBeGreaterThan(0);
      });
    });

    it("renders word numbers starting from 1", () => {
      renderUnlocked({ seed: SEED });
      expect(screen.getByText("1.")).toBeInTheDocument();
      expect(screen.getByText("12.")).toBeInTheDocument();
    });

    it("renders the paper note", () => {
      renderUnlocked({ seed: SEED });
      expect(screen.getByText("cardSeed.paperNote")).toBeInTheDocument();
    });

    it("renders the PenLine icon alongside the paper note", () => {
      renderUnlocked({ seed: SEED });
      expect(screen.getByTestId("icon-pen")).toBeInTheDocument();
    });

    it("renders the hide button", () => {
      renderUnlocked({ seed: SEED });
      expect(screen.getByText("cardSeed.hideButton")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("calls onHide when the hide button is pressed", () => {
      const onHide = jest.fn();
      renderUnlocked({ seed: SEED, onHide });

      fireEvent.click(screen.getByText("cardSeed.hideButton"));

      expect(onHide).toHaveBeenCalledTimes(1);
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
      expect(screen.getByTestId("guard-title").textContent).toBe("cardSeed.modalTitle");
    });

    it("passes the password label to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-password-label").textContent).toBe("cardSeed.passwordLabel");
    });

    it("passes the confirm text to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-confirm").textContent).toBe("cardSeed.confirmButton");
    });

    it("passes the cancel text to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-cancel").textContent).toBe("cardSeed.cancelButton");
    });
  });
});
