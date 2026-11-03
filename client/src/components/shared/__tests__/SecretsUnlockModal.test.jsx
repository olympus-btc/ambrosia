import { addToast } from "@heroui/react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

import * as secretsService from "@/services/secretsService";
import * as unlockPasswordStoreService from "@/services/unlockPasswordStoreService";

import { SecretsUnlockModal } from "../SecretsUnlockModal";

jest.mock("@/services/unlockPasswordStoreService");

jest.mock("@components/shared/SecretsRememberPasswordCheckbox", () => ({
  SecretsRememberPasswordCheckbox: ({ storageBackend, rememberUnlockPassword, onRememberUnlockPasswordChange }) => (
    <div>
      <span data-testid="remember-checkbox-storage-backend">{storageBackend}</span>
      <input
        data-testid="remember-checkbox"
        type="checkbox"
        checked={rememberUnlockPassword}
        onChange={(event) => onRememberUnlockPasswordChange(event.target.checked)}
      />
    </div>
  ),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return {
    ...actual,
    addToast: jest.fn(),
  };
});

jest.mock("framer-motion", () => {
  const React = require("react");
  const Mock = React.forwardRef(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  Mock.displayName = "MotionDiv";
  return {
    __esModule: true,
    AnimatePresence: ({ children }) => children,
    LazyMotion: ({ children }) => children,
    domAnimation: {},
    motion: new Proxy({}, { get: () => Mock }),
    m: new Proxy({}, { get: () => Mock }),
  };
});

jest.mock("@/services/secretsService", () => ({
  ...jest.requireActual("@/services/secretsService"),
  unlockSecrets: jest.fn(),
}));

jest.mock("@/hooks/usePermission");

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

const originalError = console.error;

beforeEach(() => {
  console.error = (...consoleErrorArguments) => {
    if (
      typeof consoleErrorArguments[0] === "string" &&
      (consoleErrorArguments[0].includes("onAnimationComplete") ||
        consoleErrorArguments[0].includes("Unknown event handler property"))
    ) return;
    originalError.call(console, ...consoleErrorArguments);
  };
  unlockPasswordStoreService.getStorageBackend.mockResolvedValue(null);
  unlockPasswordStoreService.saveUnlockPassword.mockResolvedValue(true);
  unlockPasswordStoreService.clearUnlockPassword.mockResolvedValue(true);
});

afterEach(() => {
  console.error = originalError;
  jest.clearAllMocks();
});

describe("SecretsUnlockModal", () => {
  it("passes the cancel callback through to WalletGuard", () => {
    const onClose = jest.fn();
    render(<SecretsUnlockModal onClose={onClose} />);

    fireEvent.click(screen.getByTestId("guard-cancel"));

    expect(onClose).toHaveBeenCalled();
  });

  it("passes the reused secretsEncryptionCard copy to WalletGuard", () => {
    render(<SecretsUnlockModal onClose={jest.fn()} />);

    expect(screen.getByTestId("guard-title")).toHaveTextContent("secretsEncryptionCard.modalTitle");
    expect(screen.getByTestId("guard-password-label")).toHaveTextContent("secretsEncryptionCard.passwordLabel");
    expect(screen.getByTestId("guard-confirm-text")).toHaveTextContent("secretsEncryptionCard.confirmButton");
    expect(screen.getByTestId("guard-cancel")).toHaveTextContent("secretsEncryptionCard.cancelButton");
  });

  it("disables the unlock button while the password is empty", () => {
    render(<SecretsUnlockModal onClose={jest.fn()} />);

    expect(screen.getByText("secretsEncryptionCard.unlockButton")).toBeDisabled();
  });

  it("closes the modal when the inner cancel button is clicked", () => {
    const onClose = jest.fn();
    render(<SecretsUnlockModal onClose={onClose} />);

    const cancelButtons = screen.getAllByText("secretsEncryptionCard.cancelButton");
    const innerCancelButton = cancelButtons.find((button) => button.dataset.testid !== "guard-cancel");
    fireEvent.click(innerCancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("toggles the password field between hidden and visible", () => {
    render(<SecretsUnlockModal onClose={jest.fn()} />);

    expect(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel")).toHaveAttribute("type", "password");

    const togglePasswordButton = screen.getAllByRole("button").find(
      (button) => !button.getAttribute("aria-label") && !button.textContent,
    );
    fireEvent.click(togglePasswordButton);

    expect(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel")).toHaveAttribute("type", "text");
  });

  it("unlocks with the entered password and dispatches SECRETS_UNLOCKED_EVENT", async () => {
    secretsService.unlockSecrets.mockResolvedValue({ message: "Secrets unlocked" });
    const dispatchEventSpy = jest.spyOn(window, "dispatchEvent");
    const onClose = jest.fn();
    render(<SecretsUnlockModal onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel"), {
      target: { value: "correct-unlock-password" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("secretsEncryptionCard.unlockButton"));
    });

    expect(secretsService.unlockSecrets).toHaveBeenCalledWith("correct-unlock-password");
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ color: "success", description: "secretsEncryptionCard.unlockSuccess" }),
    );
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: secretsService.SECRETS_UNLOCKED_EVENT }),
    );
    expect(onClose).toHaveBeenCalled();
    dispatchEventSpy.mockRestore();
  });

  it("shows the error inline on the password field and does not close when unlocking fails", async () => {
    secretsService.unlockSecrets.mockRejectedValue(new Error("Invalid credentials"));
    const onClose = jest.fn();
    render(<SecretsUnlockModal onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel"), {
      target: { value: "wrong-password" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("secretsEncryptionCard.unlockButton"));
    });

    expect(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel")).toBeInvalid();
    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    expect(addToast).not.toHaveBeenCalledWith(expect.objectContaining({ color: "danger" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("clears the inline error when the password is edited again", async () => {
    secretsService.unlockSecrets.mockRejectedValue(new Error("Invalid credentials"));
    render(<SecretsUnlockModal onClose={jest.fn()} />);

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

  describe("Remember on this device checkbox", () => {
    it("passes the fetched storage backend to the checkbox", async () => {
      unlockPasswordStoreService.getStorageBackend.mockResolvedValue("gnome-libsecret");
      render(<SecretsUnlockModal onClose={jest.fn()} />);

      await waitFor(() => (
        expect(screen.getByTestId("remember-checkbox-storage-backend")).toHaveTextContent("gnome-libsecret")
      ));
    });

    it("falls back to basic_text when the storage backend check fails", async () => {
      unlockPasswordStoreService.getStorageBackend.mockRejectedValue(new Error("IPC error"));
      render(<SecretsUnlockModal onClose={jest.fn()} />);

      await waitFor(() => (
        expect(screen.getByTestId("remember-checkbox-storage-backend")).toHaveTextContent("basic_text")
      ));
    });

    it("saves the unlock password when unlocking with the checkbox checked", async () => {
      unlockPasswordStoreService.getStorageBackend.mockResolvedValue("gnome-libsecret");
      secretsService.unlockSecrets.mockResolvedValue({ message: "Secrets unlocked" });
      render(<SecretsUnlockModal onClose={jest.fn()} />);

      await waitFor(() => (
        expect(screen.getByTestId("remember-checkbox-storage-backend")).toHaveTextContent("gnome-libsecret")
      ));
      fireEvent.click(screen.getByTestId("remember-checkbox"));
      fireEvent.change(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel"), {
        target: { value: "correct-unlock-password" },
      });
      await act(async () => {
        fireEvent.click(screen.getByText("secretsEncryptionCard.unlockButton"));
      });

      expect(unlockPasswordStoreService.saveUnlockPassword).toHaveBeenCalledWith("correct-unlock-password");
      expect(unlockPasswordStoreService.clearUnlockPassword).not.toHaveBeenCalled();
    });

    it("clears any saved unlock password when unlocking with the checkbox unchecked", async () => {
      unlockPasswordStoreService.getStorageBackend.mockResolvedValue("gnome-libsecret");
      secretsService.unlockSecrets.mockResolvedValue({ message: "Secrets unlocked" });
      render(<SecretsUnlockModal onClose={jest.fn()} />);

      await waitFor(() => (
        expect(screen.getByTestId("remember-checkbox-storage-backend")).toHaveTextContent("gnome-libsecret")
      ));
      fireEvent.change(screen.getByLabelText("secretsEncryptionCard.unlockPasswordLabel"), {
        target: { value: "correct-unlock-password" },
      });
      await act(async () => {
        fireEvent.click(screen.getByText("secretsEncryptionCard.unlockButton"));
      });

      expect(unlockPasswordStoreService.clearUnlockPassword).toHaveBeenCalled();
      expect(unlockPasswordStoreService.saveUnlockPassword).not.toHaveBeenCalled();
    });
  });
});
