import { render, screen, fireEvent, act } from "@testing-library/react";

import * as walletService from "@/services/walletService";

import { NwcConnectionCardUnlocked } from "../NwcConnectionCardUnlocked";

jest.mock("@/hooks/usePermission");

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ onPress, children, isDisabled, ...props }) => (
    <button type="button" disabled={isDisabled} onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Input: ({ label, value, onValueChange, errorMessage }) => (
    <div>
      <label htmlFor="nwc-uri-input">{label}</label>
      <input id="nwc-uri-input" value={value} onChange={(event) => onValueChange(event.target.value)} />
      {errorMessage && <span>{errorMessage}</span>}
    </div>
  ),
}));

jest.mock("@components/auth/WalletGuard", () => function MockWalletGuard({ children, onCancel, title, passwordLabel, confirmText, cancelText }) {
  return (
    <div>
      <span data-testid="guard-title">{title}</span>
      <span data-testid="guard-password-label">{passwordLabel}</span>
      <span data-testid="guard-confirm-text">{confirmText}</span>
      <button type="button" data-testid="guard-cancel" onClick={onCancel}>{cancelText}</button>
      {children}
    </div>
  );
},
);

jest.mock("@/services/walletService");

const translate = (key) => key;
const validNwcUri = `nostr+walletconnect://${"a".repeat(64)}?relay=wss%3A%2F%2Frelay.example.com&secret=${"b".repeat(64)}`;

function renderUnlocked(props = {}) {
  return render(<NwcConnectionCardUnlocked nwcConnectionTranslations={translate} onHide={jest.fn()} {...props} />);
}

describe("NwcConnectionCardUnlocked", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("WalletGuard props", () => {
    it("passes the modal title to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-title").textContent).toBe("nwcConnection.modalTitle");
    });

    it("passes the password label to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-password-label").textContent).toBe("nwcConnection.passwordLabel");
    });

    it("passes the confirm text to WalletGuard", () => {
      renderUnlocked();
      expect(screen.getByTestId("guard-confirm-text").textContent).toBe("nwcConnection.confirmButton");
    });
  });

  describe("Rendering", () => {
    it("renders the URI input", () => {
      renderUnlocked();
      expect(screen.getByLabelText("nwcConnection.uriLabel")).toBeInTheDocument();
    });

    it("renders the submit and hide buttons", () => {
      renderUnlocked();
      expect(screen.getByText("nwcConnection.submitButton")).toBeInTheDocument();
      expect(screen.getByText("nwcConnection.hideButton")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("calls onHide when the hide button is pressed", () => {
      const onHide = jest.fn();
      renderUnlocked({ onHide });
      fireEvent.click(screen.getByText("nwcConnection.hideButton"));
      expect(onHide).toHaveBeenCalledTimes(1);
    });

    it("forwards onHide as onCancel to WalletGuard", () => {
      const onHide = jest.fn();
      renderUnlocked({ onHide });
      fireEvent.click(screen.getByTestId("guard-cancel"));
      expect(onHide).toHaveBeenCalledTimes(1);
    });

    it("shows a validation error and does not submit when the URI format is invalid", async () => {
      renderUnlocked();
      const uriInput = screen.getByLabelText("nwcConnection.uriLabel");

      fireEvent.change(uriInput, { target: { value: "not-a-valid-uri" } });
      await act(async () => {
        fireEvent.click(screen.getByText("nwcConnection.submitButton"));
      });

      expect(screen.getByText("nwcConnection.uriInvalid")).toBeInTheDocument();
      expect(walletService.updateNwcUri).not.toHaveBeenCalled();
    });

    it("submits a valid URI and shows a success toast", async () => {
      walletService.updateNwcUri.mockResolvedValue({ message: "NWC backend reconfigured" });
      const { addToast } = require("@heroui/react");
      renderUnlocked();
      const uriInput = screen.getByLabelText("nwcConnection.uriLabel");

      fireEvent.change(uriInput, { target: { value: validNwcUri } });
      await act(async () => {
        fireEvent.click(screen.getByText("nwcConnection.submitButton"));
      });

      expect(walletService.updateNwcUri).toHaveBeenCalledWith(validNwcUri);
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "success", description: "nwcConnection.success" }),
      );
    });

    it("shows a translated error toast when the connection fails", async () => {
      const connectionError = new Error("Could not connect");
      connectionError.code = "nwc_connection_failed";
      walletService.updateNwcUri.mockRejectedValue(connectionError);
      const { addToast } = require("@heroui/react");
      renderUnlocked();
      const uriInput = screen.getByLabelText("nwcConnection.uriLabel");

      fireEvent.change(uriInput, { target: { value: validNwcUri } });
      await act(async () => {
        fireEvent.click(screen.getByText("nwcConnection.submitButton"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "nwcConnection.errors.connectionFailed" }),
      );
    });

    it("shows a translated error toast when reconfiguring fails", async () => {
      const reconfigureError = new Error("Could not reconfigure");
      reconfigureError.code = "nwc_reconfigure_failed";
      walletService.updateNwcUri.mockRejectedValue(reconfigureError);
      const { addToast } = require("@heroui/react");
      renderUnlocked();
      const uriInput = screen.getByLabelText("nwcConnection.uriLabel");

      fireEvent.change(uriInput, { target: { value: validNwcUri } });
      await act(async () => {
        fireEvent.click(screen.getByText("nwcConnection.submitButton"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "nwcConnection.errors.connectionFailed" }),
      );
    });

    it("shows a translated error toast when switching providers is not supported", async () => {
      const providerSwitchError = new Error("Not supported");
      providerSwitchError.code = "provider_switch_not_supported";
      walletService.updateNwcUri.mockRejectedValue(providerSwitchError);
      const { addToast } = require("@heroui/react");
      renderUnlocked();
      const uriInput = screen.getByLabelText("nwcConnection.uriLabel");

      fireEvent.change(uriInput, { target: { value: validNwcUri } });
      await act(async () => {
        fireEvent.click(screen.getByText("nwcConnection.submitButton"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "nwcConnection.errors.providerSwitchNotSupported" }),
      );
    });

    it("shows the generic unknown error message when the error has no recognized code", async () => {
      walletService.updateNwcUri.mockRejectedValue(new Error("boom"));
      const { addToast } = require("@heroui/react");
      renderUnlocked();
      const uriInput = screen.getByLabelText("nwcConnection.uriLabel");

      fireEvent.change(uriInput, { target: { value: validNwcUri } });
      await act(async () => {
        fireEvent.click(screen.getByText("nwcConnection.submitButton"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "boom" }),
      );
    });
  });
});
