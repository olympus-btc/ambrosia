import { render, screen, fireEvent, act } from "@testing-library/react";

import * as secretsService from "@/services/secretsService";

import { SecretsEncryptionCardDetails } from "../SecretsEncryptionCardDetails";

jest.mock("@/hooks/usePermission");

jest.mock("@/services/secretsService");

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ onPress, children, isDisabled, ...props }) => (
    <button type="button" disabled={isDisabled} onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Input: ({ label, type, value: passwordValue, onValueChange: onPasswordValueChange, endContent, isInvalid, errorMessage }) => (
    <div>
      <label htmlFor={label}>{label}</label>
      <input
        id={label}
        type={type}
        value={passwordValue}
        onChange={(event) => onPasswordValueChange(event.target.value)}
        aria-invalid={isInvalid}
      />
      {isInvalid && errorMessage && <span>{errorMessage}</span>}
      {endContent}
    </div>
  ),
  Spinner: () => <div data-testid="spinner" />,
}));

jest.mock("@components/shared/SecretsUnlockPasswordField", () => ({
  SecretsUnlockPasswordField: ({
    unlockPassword,
    onUnlockPasswordChange,
    unlockPasswordConfirmation,
    onUnlockPasswordConfirmationChange,
  }) => (
    <>
      <input
        data-testid="secrets-unlock-password-field"
        value={unlockPassword}
        onChange={(event) => onUnlockPasswordChange(event.target.value)}
      />
      <input
        data-testid="secrets-unlock-password-confirm-field"
        value={unlockPasswordConfirmation}
        onChange={(event) => onUnlockPasswordConfirmationChange(event.target.value)}
      />
    </>
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

const translate = (key) => key;

function renderDetails(props = {}) {
  return render(<SecretsEncryptionCardDetails secretsEncryptionCardTranslations={translate} onHide={jest.fn()} {...props} />);
}

async function authorize() {
  await act(async () => {
    fireEvent.click(screen.getByTestId("guard-confirm"));
  });
}

describe("SecretsEncryptionCardDetails", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("WalletGuard props", () => {
    it("passes the modal title to WalletGuard", () => {
      renderDetails();
      expect(screen.getByTestId("guard-title").textContent).toBe("secretsEncryptionCard.modalTitle");
    });

    it("passes the password label to WalletGuard", () => {
      renderDetails();
      expect(screen.getByTestId("guard-password-label").textContent).toBe("secretsEncryptionCard.passwordLabel");
    });

    it("forwards onHide as onCancel to WalletGuard", () => {
      const onHide = jest.fn();
      renderDetails({ onHide });
      fireEvent.click(screen.getByTestId("guard-cancel"));
      expect(onHide).toHaveBeenCalledTimes(1);
    });
  });

  describe("Before authorization", () => {
    it("shows a spinner and does not fetch the status", () => {
      renderDetails();
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(secretsService.getSecretsStatus).not.toHaveBeenCalled();
    });
  });

  describe("onAuthorized — loading the current status", () => {
    it("shows an error toast when the status fetch fails", async () => {
      secretsService.getSecretsStatus.mockRejectedValue(new Error("network error"));
      const { addToast } = require("@heroui/react");
      renderDetails();

      await authorize();

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "secretsEncryptionCard.statusLoadError" }),
      );
    });

    it("shows the activation form when encryption is not active", async () => {
      secretsService.getSecretsStatus.mockResolvedValue({ encryptionActive: false, locked: false });
      renderDetails();

      await authorize();

      expect(screen.getByText("secretsEncryptionCard.inactiveDescription")).toBeInTheDocument();
      expect(screen.getByText("secretsEncryptionCard.activateButton")).toBeInTheDocument();
    });

    it("shows the unlock form when encryption is active and locked", async () => {
      secretsService.getSecretsStatus.mockResolvedValue({ encryptionActive: true, locked: true });
      renderDetails();

      await authorize();

      expect(screen.getByText("secretsEncryptionCard.lockedDescription")).toBeInTheDocument();
      expect(screen.getByText("secretsEncryptionCard.unlockButton")).toBeInTheDocument();
    });

    it("shows the confirmed state when encryption is active and unlocked", async () => {
      secretsService.getSecretsStatus.mockResolvedValue({ encryptionActive: true, locked: false });
      renderDetails();

      await authorize();

      expect(screen.getByText("secretsEncryptionCard.unlockedDescription")).toBeInTheDocument();
      expect(screen.queryByText("secretsEncryptionCard.activateButton")).not.toBeInTheDocument();
      expect(screen.queryByText("secretsEncryptionCard.unlockButton")).not.toBeInTheDocument();
    });
  });

  describe("Activating encryption", () => {
    beforeEach(async () => {
      secretsService.getSecretsStatus.mockResolvedValue({ encryptionActive: false, locked: false });
      renderDetails();
      await authorize();
    });

    it("disables the activate button while the password is empty", () => {
      expect(screen.getByText("secretsEncryptionCard.activateButton")).toBeDisabled();
    });

    it("disables the activate button when the passwords don't match", () => {
      fireEvent.change(screen.getByTestId("secrets-unlock-password-field"), {
        target: { value: "correct-unlock-password" },
      });
      fireEvent.change(screen.getByTestId("secrets-unlock-password-confirm-field"), {
        target: { value: "different-password" },
      });

      expect(screen.getByText("secretsEncryptionCard.activateButton")).toBeDisabled();
    });

    it("activates encryption with the entered password and shows the confirmed state", async () => {
      secretsService.activateSecretsEncryption.mockResolvedValue({ message: "Secrets encryption activated" });

      fireEvent.change(screen.getByTestId("secrets-unlock-password-field"), {
        target: { value: "correct-unlock-password" },
      });
      fireEvent.change(screen.getByTestId("secrets-unlock-password-confirm-field"), {
        target: { value: "correct-unlock-password" },
      });
      await act(async () => {
        fireEvent.click(screen.getByText("secretsEncryptionCard.activateButton"));
      });

      expect(secretsService.activateSecretsEncryption).toHaveBeenCalledWith("correct-unlock-password");
      expect(screen.getByText("secretsEncryptionCard.unlockedDescription")).toBeInTheDocument();
      const { addToast } = require("@heroui/react");
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "success", description: "secretsEncryptionCard.activateSuccess" }),
      );
    });

    it("dispatches SECRETS_UNLOCKED_EVENT after activating successfully", async () => {
      secretsService.activateSecretsEncryption.mockResolvedValue({ message: "Secrets encryption activated" });
      const dispatchEventSpy = jest.spyOn(window, "dispatchEvent");

      fireEvent.change(screen.getByTestId("secrets-unlock-password-field"), {
        target: { value: "correct-unlock-password" },
      });
      fireEvent.change(screen.getByTestId("secrets-unlock-password-confirm-field"), {
        target: { value: "correct-unlock-password" },
      });
      await act(async () => {
        fireEvent.click(screen.getByText("secretsEncryptionCard.activateButton"));
      });

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: secretsService.SECRETS_UNLOCKED_EVENT }),
      );
      dispatchEventSpy.mockRestore();
    });

    it("shows an error toast when activation fails", async () => {
      secretsService.activateSecretsEncryption.mockRejectedValue(new Error("Could not reach the server"));
      const { addToast } = require("@heroui/react");

      fireEvent.change(screen.getByTestId("secrets-unlock-password-field"), {
        target: { value: "correct-unlock-password" },
      });
      fireEvent.change(screen.getByTestId("secrets-unlock-password-confirm-field"), {
        target: { value: "correct-unlock-password" },
      });
      await act(async () => {
        fireEvent.click(screen.getByText("secretsEncryptionCard.activateButton"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "Could not reach the server" }),
      );
    });
  });

  describe("Unlocking encryption", () => {
    beforeEach(async () => {
      secretsService.getSecretsStatus.mockResolvedValue({ encryptionActive: true, locked: true });
      renderDetails();
      await authorize();
    });

    it("disables the unlock button while the password is empty", () => {
      expect(screen.getByText("secretsEncryptionCard.unlockButton")).toBeDisabled();
    });

    it("unlocks with the entered password and shows the confirmed state", async () => {
      secretsService.unlockSecrets.mockResolvedValue({ message: "Secrets unlocked" });

      fireEvent.change(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel"), {
        target: { value: "correct-unlock-password" },
      });
      await act(async () => {
        fireEvent.click(screen.getByText("secretsEncryptionCard.unlockButton"));
      });

      expect(secretsService.unlockSecrets).toHaveBeenCalledWith("correct-unlock-password");
      expect(screen.getByText("secretsEncryptionCard.unlockedDescription")).toBeInTheDocument();
      const { addToast } = require("@heroui/react");
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "success", description: "secretsEncryptionCard.unlockSuccess" }),
      );
    });

    it("dispatches SECRETS_UNLOCKED_EVENT after unlocking successfully", async () => {
      secretsService.unlockSecrets.mockResolvedValue({ message: "Secrets unlocked" });
      const dispatchEventSpy = jest.spyOn(window, "dispatchEvent");

      fireEvent.change(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel"), {
        target: { value: "correct-unlock-password" },
      });
      await act(async () => {
        fireEvent.click(screen.getByText("secretsEncryptionCard.unlockButton"));
      });

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: secretsService.SECRETS_UNLOCKED_EVENT }),
      );
      dispatchEventSpy.mockRestore();
    });

    it("shows the error inline on the password field when unlocking fails", async () => {
      secretsService.unlockSecrets.mockRejectedValue(new Error("Invalid credentials"));
      const { addToast } = require("@heroui/react");

      fireEvent.change(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel"), {
        target: { value: "wrong-password" },
      });
      await act(async () => {
        fireEvent.click(screen.getByText("secretsEncryptionCard.unlockButton"));
      });

      expect(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel")).toBeInvalid();
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
      expect(addToast).not.toHaveBeenCalledWith(expect.objectContaining({ color: "danger" }));
    });

    it("clears the inline error when the password is edited again", async () => {
      secretsService.unlockSecrets.mockRejectedValue(new Error("Invalid credentials"));

      fireEvent.change(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel"), {
        target: { value: "wrong-password" },
      });
      await act(async () => {
        fireEvent.click(screen.getByText("secretsEncryptionCard.unlockButton"));
      });
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel"), {
        target: { value: "wrong-password-retry" },
      });

      expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument();
    });

    it("toggles the password field between hidden and visible", () => {
      expect(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel")).toHaveAttribute("type", "password");

      const togglePasswordButton = screen.getAllByRole("button").find(
        (button) => !button.getAttribute("aria-label") && !button.textContent,
      );
      fireEvent.click(togglePasswordButton);

      expect(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel")).toHaveAttribute("type", "text");
    });
  });

  describe("Interaction", () => {
    it("calls onHide when the hide button is pressed", async () => {
      const onHide = jest.fn();
      secretsService.getSecretsStatus.mockResolvedValue({ encryptionActive: true, locked: false });
      renderDetails({ onHide });

      await authorize();
      fireEvent.click(screen.getByText("secretsEncryptionCard.hideButton"));

      expect(onHide).toHaveBeenCalledTimes(1);
    });
  });
});
