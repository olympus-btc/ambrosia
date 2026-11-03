import { render, screen, fireEvent, act } from "@testing-library/react";

import * as walletService from "@/services/walletService";
import { restartAppAfterPhoenixdRemoteChange } from "@/utils/restartAppAfterPhoenixdRemoteChange";

import { PhoenixdRemoteCardUnlocked } from "../PhoenixdRemoteCardUnlocked";

jest.mock("@/hooks/usePermission");

jest.mock("@/services/walletService");

jest.mock("@/utils/restartAppAfterPhoenixdRemoteChange");

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ onPress, children, isDisabled, ...props }) => (
    <button type="button" disabled={isDisabled} onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
}));

jest.mock("@components/auth/WalletGuard", () => function MockWalletGuard({ children, onAuthorized, onCancel, title, passwordLabel, confirmText, cancelText }) {
  return (
    <div>
      <span data-testid="guard-title">{title}</span>
      <span data-testid="guard-password-label">{passwordLabel}</span>
      <span data-testid="guard-confirm-text">{confirmText}</span>
      <button type="button" data-testid="guard-confirm" onClick={onAuthorized}>{confirmText}</button>
      <button type="button" data-testid="guard-cancel" onClick={onCancel}>{cancelText}</button>
      {children}
    </div>
  );
},
);

jest.mock("@components/shared/PhoenixdRemoteFields", () => ({
  PhoenixdRemoteFields: ({ phoenixdRemote, onPhoenixdRemoteChange, onPhoenixdUrlChange, onPhoenixdPasswordChange }) => (
    <div data-testid="phoenixd-remote-fields">
      <span data-testid="remote-value">{String(phoenixdRemote)}</span>
      <button type="button" onClick={() => onPhoenixdRemoteChange(true)}>set-remote-true</button>
      <button type="button" onClick={() => onPhoenixdRemoteChange(false)}>set-remote-false</button>
      <button type="button" onClick={() => onPhoenixdUrlChange("http://100.1.1.1:9740")}>set-url</button>
      <button type="button" onClick={() => onPhoenixdPasswordChange("remote-password")}>set-password</button>
    </div>
  ),
}));

jest.mock("@components/shared/RestartRequiredModal", () => ({
  RestartRequiredModal: ({ isOpen, onManualClose, onRestart }) => (
    isOpen ? (
      <div data-testid="restart-modal">
        <button type="button" data-testid="restart-modal-manual-close" onClick={onManualClose}>manual-close</button>
        <button type="button" data-testid="restart-modal-restart" onClick={onRestart}>restart</button>
      </div>
    ) : null
  ),
}));

jest.mock("../PhoenixdRemoteActivatedModal", () => ({
  PhoenixdRemoteActivatedModal: ({ isOpen, onAcknowledge, phoenixdRemoteCardTranslations }) => (
    isOpen ? (
      <div data-testid="remote-activated-modal">
        <span>{phoenixdRemoteCardTranslations("phoenixdRemoteCard.remoteActivatedTitle")}</span>
        <span>{phoenixdRemoteCardTranslations("phoenixdRemoteCard.remoteActivatedDescription")}</span>
        <button type="button" data-testid="remote-activated-modal-acknowledge" onClick={onAcknowledge}>acknowledge</button>
      </div>
    ) : null
  ),
}));

const translate = (key) => key;

function renderUnlocked(props = {}) {
  return render(<PhoenixdRemoteCardUnlocked phoenixdRemoteCardTranslations={translate} onHide={jest.fn()} {...props} />);
}

describe("PhoenixdRemoteCardUnlocked", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("WalletGuard props", () => {
    it("passes the modal title to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-title").textContent).toBe("phoenixdRemoteCard.modalTitle");
    });

    it("passes the password label to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-password-label").textContent).toBe("phoenixdRemoteCard.passwordLabel");
    });
  });

  describe("Rendering", () => {
    it("renders PhoenixdRemoteFields", () => {
      renderUnlocked();
      expect(screen.getByTestId("phoenixd-remote-fields")).toBeInTheDocument();
    });

    it("renders the submit and hide buttons", () => {
      renderUnlocked();
      expect(screen.getByText("phoenixdRemoteCard.submitButton")).toBeInTheDocument();
      expect(screen.getByText("phoenixdRemoteCard.hideButton")).toBeInTheDocument();
    });

    it("disables the submit button before the toggle has been touched", () => {
      renderUnlocked();
      expect(screen.getByText("phoenixdRemoteCard.submitButton")).toBeDisabled();
    });
  });

  describe("onAuthorized — loading the current status", () => {
    it("fetches and displays the current phoenixd-remote status", async () => {
      walletService.getPhoenixdRemoteStatus.mockResolvedValue({ phoenixdRemote: true });
      renderUnlocked();

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      expect(screen.getByTestId("remote-value").textContent).toBe("true");
    });

    it("enables the submit button once the status has loaded, even without touching the toggle", async () => {
      walletService.getPhoenixdRemoteStatus.mockResolvedValue({ phoenixdRemote: false });
      renderUnlocked();

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      expect(screen.getByText("phoenixdRemoteCard.submitButton")).not.toBeDisabled();
    });

    it("shows an error toast when the status fetch fails", async () => {
      walletService.getPhoenixdRemoteStatus.mockRejectedValue(new Error("network error"));
      const { addToast } = require("@heroui/react");
      renderUnlocked();

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "phoenixdRemoteCard.statusLoadError" }),
      );
    });
  });

  describe("Interaction", () => {
    it("calls onHide when the hide button is pressed", () => {
      const onHide = jest.fn();
      renderUnlocked({ onHide });
      fireEvent.click(screen.getByText("phoenixdRemoteCard.hideButton"));
      expect(onHide).toHaveBeenCalledTimes(1);
    });

    it("forwards onHide as onCancel to WalletGuard", () => {
      const onHide = jest.fn();
      renderUnlocked({ onHide });
      fireEvent.click(screen.getByTestId("guard-cancel"));
      expect(onHide).toHaveBeenCalledTimes(1);
    });

    it("keeps the submit button disabled while remote is on but url/password are missing", () => {
      renderUnlocked();
      fireEvent.click(screen.getByText("set-remote-true"));
      expect(screen.getByText("phoenixdRemoteCard.submitButton")).toBeDisabled();
    });

    it("enables the submit button once remote is off, without requiring url/password", () => {
      renderUnlocked();
      fireEvent.click(screen.getByText("set-remote-false"));
      expect(screen.getByText("phoenixdRemoteCard.submitButton")).not.toBeDisabled();
    });

    it("submits remote=true with url and password, shows the remote-activated modal, and clears the fields", async () => {
      walletService.updatePhoenixdRemote.mockResolvedValue({ message: "Remote phoenixd node configured" });
      renderUnlocked();

      fireEvent.click(screen.getByText("set-remote-true"));
      fireEvent.click(screen.getByText("set-url"));
      fireEvent.click(screen.getByText("set-password"));
      await act(async () => {
        fireEvent.click(screen.getByText("phoenixdRemoteCard.submitButton"));
      });

      expect(walletService.updatePhoenixdRemote).toHaveBeenCalledWith({
        phoenixdRemote: true,
        phoenixdUrl: "http://100.1.1.1:9740",
        phoenixdPassword: "remote-password",
      });
      expect(screen.getByText("phoenixdRemoteCard.remoteActivatedTitle")).toBeInTheDocument();
      expect(screen.getByText("phoenixdRemoteCard.remoteActivatedDescription")).toBeInTheDocument();
    });

    it("closes the remote-activated modal when acknowledged", async () => {
      walletService.updatePhoenixdRemote.mockResolvedValue({ message: "Remote phoenixd node configured" });
      renderUnlocked();

      fireEvent.click(screen.getByText("set-remote-true"));
      fireEvent.click(screen.getByText("set-url"));
      fireEvent.click(screen.getByText("set-password"));
      await act(async () => {
        fireEvent.click(screen.getByText("phoenixdRemoteCard.submitButton"));
      });
      fireEvent.click(screen.getByTestId("remote-activated-modal-acknowledge"));

      expect(screen.queryByText("phoenixdRemoteCard.remoteActivatedTitle")).not.toBeInTheDocument();
    });

    it("submits remote=false and shows the restart modal", async () => {
      walletService.updatePhoenixdRemote.mockResolvedValue({ message: "Switched to local phoenixd — restart required to apply" });
      renderUnlocked();

      fireEvent.click(screen.getByText("set-remote-false"));
      await act(async () => {
        fireEvent.click(screen.getByText("phoenixdRemoteCard.submitButton"));
      });

      expect(walletService.updatePhoenixdRemote).toHaveBeenCalledWith({
        phoenixdRemote: false,
        phoenixdUrl: undefined,
        phoenixdPassword: undefined,
      });
      expect(screen.getByTestId("restart-modal")).toBeInTheDocument();
    });

    it("passes restartAppAfterPhoenixdRemoteChange as onRestart to the restart modal", async () => {
      walletService.updatePhoenixdRemote.mockResolvedValue({ message: "Switched to local phoenixd — restart required to apply" });
      renderUnlocked();

      fireEvent.click(screen.getByText("set-remote-false"));
      await act(async () => {
        fireEvent.click(screen.getByText("phoenixdRemoteCard.submitButton"));
      });
      fireEvent.click(screen.getByTestId("restart-modal-restart"));

      expect(restartAppAfterPhoenixdRemoteChange).toHaveBeenCalledTimes(1);
    });

    it("closes the restart modal without a relaunch when manually closed", async () => {
      walletService.updatePhoenixdRemote.mockResolvedValue({ message: "Switched to local phoenixd — restart required to apply" });
      renderUnlocked();

      fireEvent.click(screen.getByText("set-remote-false"));
      await act(async () => {
        fireEvent.click(screen.getByText("phoenixdRemoteCard.submitButton"));
      });
      fireEvent.click(screen.getByTestId("restart-modal-manual-close"));

      expect(restartAppAfterPhoenixdRemoteChange).not.toHaveBeenCalled();
      expect(screen.queryByTestId("restart-modal")).not.toBeInTheDocument();
    });

    it("shows an error toast when saving fails", async () => {
      walletService.updatePhoenixdRemote.mockRejectedValue(new Error("Missing url or password"));
      const { addToast } = require("@heroui/react");
      renderUnlocked();

      fireEvent.click(screen.getByText("set-remote-true"));
      fireEvent.click(screen.getByText("set-url"));
      fireEvent.click(screen.getByText("set-password"));
      await act(async () => {
        fireEvent.click(screen.getByText("phoenixdRemoteCard.submitButton"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "Missing url or password" }),
      );
    });

    it("shows a secrets-locked-specific message when saving fails with a 409 status", async () => {
      const secretsLockedError = new Error("Connection failed");
      secretsLockedError.status = 409;
      walletService.updatePhoenixdRemote.mockRejectedValue(secretsLockedError);
      walletService.isSecretsLockedError.mockReturnValue(true);
      const { addToast } = require("@heroui/react");
      renderUnlocked();

      fireEvent.click(screen.getByText("set-remote-true"));
      fireEvent.click(screen.getByText("set-url"));
      fireEvent.click(screen.getByText("set-password"));
      await act(async () => {
        fireEvent.click(screen.getByText("phoenixdRemoteCard.submitButton"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "phoenixdRemoteCard.secretsLockedError" }),
      );
    });
  });
});
