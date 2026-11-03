import { render, screen, fireEvent } from "@testing-library/react";

import { MockHeroUIProgress } from "@test-utils/mockHeroUIProgress";

import { ExportDataCardUnlocked } from "../ExportDataCardUnlocked";

jest.mock("@heroui/react", () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Spinner: () => <div data-testid="spinner" />,
  Progress: MockHeroUIProgress,
}));

jest.mock("@components/auth/WalletGuard", () => function MockWalletGuard({ children, onAuthorized, onCancel, title, passwordLabel, confirmText, cancelText }) {
  return (
    <div>
      <span data-testid="guard-title">{title}</span>
      <span data-testid="guard-password-label">{passwordLabel}</span>
      <span data-testid="guard-confirm-text">{confirmText}</span>
      <span data-testid="guard-cancel-text">{cancelText}</span>
      <button type="button" data-testid="guard-confirm" onClick={() => onAuthorized("wallet-password")}>confirm</button>
      <button type="button" data-testid="guard-cancel" onClick={onCancel}>cancel</button>
      {children}
    </div>
  );
},
);

const exportDataTranslations = (key) => key;

function renderUnlocked(props = {}) {
  return render(
    <ExportDataCardUnlocked exportDataTranslations={exportDataTranslations} onAuthorized={jest.fn()} onHide={jest.fn()} {...props} />,
  );
}

describe("ExportDataCardUnlocked", () => {
  describe("WalletGuard props", () => {
    it("passes the modal title to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-title").textContent).toBe("cardExportData.modalTitle");
    });

    it("passes the password label to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-password-label").textContent).toBe("cardExportData.passwordLabel");
    });

    it("passes the confirm text to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-confirm-text").textContent).toBe("cardExportData.confirmButton");
    });

    it("passes the cancel text to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-cancel-text").textContent).toBe("cardExportData.cancelButton");
    });
  });

  describe("Rendering", () => {
    it("renders the title", () => {
      renderUnlocked();
      expect(screen.getByText("cardExportData.title")).toBeInTheDocument();
    });

    it("renders the exporting message", () => {
      renderUnlocked();
      expect(screen.getByText("cardExportData.exporting")).toBeInTheDocument();
    });

    it("renders a spinner", () => {
      renderUnlocked();
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
  });

  describe("Progress", () => {
    it("shows a spinner when no progress value is provided", () => {
      renderUnlocked();
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.queryByTestId("progress")).not.toBeInTheDocument();
    });

    it("shows a spinner with the phase label while the percent is not known yet", () => {
      renderUnlocked({ exportProgress: { phase: "preparing", percent: null } });
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.getByText("cardExportData.phasePreparing")).toBeInTheDocument();
    });

    it("shows a progress bar with the given percent instead of the spinner", () => {
      renderUnlocked({ exportProgress: { phase: "writing", percent: 42 } });
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
      expect(screen.getByTestId("progress")).toHaveAttribute("data-value", "42");
    });

    it("shows the phase translation key and percent while a percent is known", () => {
      renderUnlocked({ exportProgress: { phase: "writing", percent: 42 } });
      expect(screen.getByText("cardExportData.phaseWriting 42%")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("calls onAuthorized with the entered password when WalletGuard confirms", () => {
      const onAuthorized = jest.fn();
      renderUnlocked({ onAuthorized });
      fireEvent.click(screen.getByTestId("guard-confirm"));
      expect(onAuthorized).toHaveBeenCalledWith("wallet-password");
    });

    it("calls onHide when WalletGuard cancels", () => {
      const onHide = jest.fn();
      renderUnlocked({ onHide });
      fireEvent.click(screen.getByTestId("guard-cancel"));
      expect(onHide).toHaveBeenCalledTimes(1);
    });
  });
});
