import { addToast } from "@heroui/react";
import { render, screen, fireEvent, act } from "@testing-library/react";

import * as secretsService from "@/services/secretsService";

import { SecretsUnlockModal } from "../SecretsUnlockModal";

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
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("onAnimationComplete") ||
        args[0].includes("Unknown event handler property"))
    ) return;
    originalError.call(console, ...args);
  };
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
});
