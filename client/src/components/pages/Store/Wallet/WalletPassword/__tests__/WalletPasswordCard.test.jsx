import { addToast } from "@heroui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import * as walletService from "@/services/walletService";

import { WalletPasswordCard } from "../WalletPasswordCard";

jest.mock("@/services/walletService", () => ({
  changeWalletPassword: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey) => translationKey,
}));

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ children, isDisabled, isLoading, type = "button", ...buttonProps }) => (
    <button type={type} disabled={isDisabled || isLoading} {...buttonProps}>
      {children}
    </button>
  ),
  Card: ({ children }) => <section>{children}</section>,
  CardBody: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  Input: ({
    endContent,
    errorMessage,
    isDisabled,
    isInvalid,
    label,
    onChange,
    type,
    value,
  }) => (
    <label>
      {label}
      <input
        aria-invalid={isInvalid}
        disabled={isDisabled}
        onChange={onChange}
        type={type}
        value={value}
      />
      {endContent}
      {errorMessage ? <span>{errorMessage}</span> : null}
    </label>
  ),
}));

jest.mock("lucide-react", () => ({
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eye-off-icon" />,
}));

function fillPasswordForm({
  currentPassword = "old-secret",
  newPassword = "new-secret",
  confirmPassword = "new-secret",
} = {}) {
  fireEvent.change(screen.getByLabelText("currentPasswordLabel"), {
    target: { value: currentPassword },
  });
  fireEvent.change(screen.getByLabelText("newPasswordLabel"), {
    target: { value: newPassword },
  });
  fireEvent.change(screen.getByLabelText("confirmPasswordLabel"), {
    target: { value: confirmPassword },
  });
}

function createDeferredPasswordChange() {
  let resolvePasswordChange;
  const passwordChangePromise = new Promise((resolve) => {
    resolvePasswordChange = resolve;
  });
  return { passwordChangePromise, resolvePasswordChange };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("WalletPasswordCard", () => {
  it("shows required field errors when submitted empty", () => {
    render(<WalletPasswordCard />);

    fireEvent.click(screen.getByText("submitButton"));

    expect(screen.getAllByText("requiredError")).toHaveLength(3);
    expect(walletService.changeWalletPassword).not.toHaveBeenCalled();
  });

  it("shows mismatch error when new passwords do not match", () => {
    render(<WalletPasswordCard />);

    fillPasswordForm({ newPassword: "new-secret", confirmPassword: "different-secret" });
    fireEvent.click(screen.getByText("submitButton"));

    expect(screen.getByText("mismatchError")).toBeInTheDocument();
    expect(walletService.changeWalletPassword).not.toHaveBeenCalled();
  });

  it("changes wallet password and shows success toast", async () => {
    walletService.changeWalletPassword.mockResolvedValue({ message: "Wallet password updated" });
    render(<WalletPasswordCard />);

    fillPasswordForm();
    fireEvent.click(screen.getByText("submitButton"));

    await waitFor(() => {
      expect(walletService.changeWalletPassword).toHaveBeenCalledWith({
        currentPassword: "old-secret",
        newPassword: "new-secret",
      });
      expect(addToast).toHaveBeenCalledWith({
        color: "success",
        description: "successToast",
      });
    });
  });

  it("shows an error toast when password change fails", async () => {
    walletService.changeWalletPassword.mockRejectedValue(new Error("invalid password"));
    render(<WalletPasswordCard />);

    fillPasswordForm();
    fireEvent.click(screen.getByText("submitButton"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith({
        color: "danger",
        description: "errorToast",
      });
    });
  });

  it("shows an inline error when current password is incorrect", async () => {
    const incorrectCurrentPasswordError = new Error("Current password is incorrect");
    incorrectCurrentPasswordError.status = 401;
    walletService.changeWalletPassword.mockRejectedValue(incorrectCurrentPasswordError);
    render(<WalletPasswordCard />);

    fillPasswordForm({ currentPassword: "wrong-secret" });
    fireEvent.click(screen.getByText("submitButton"));

    expect(await screen.findByText("currentPasswordIncorrectError")).toBeInTheDocument();
    expect(addToast).not.toHaveBeenCalled();
  });

  it("clears incorrect current password error when current password changes", async () => {
    const incorrectCurrentPasswordError = new Error("Current password is incorrect");
    incorrectCurrentPasswordError.status = 401;
    walletService.changeWalletPassword.mockRejectedValue(incorrectCurrentPasswordError);
    render(<WalletPasswordCard />);

    fillPasswordForm({ currentPassword: "wrong-secret" });
    fireEvent.click(screen.getByText("submitButton"));

    expect(await screen.findByText("currentPasswordIncorrectError")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("wrong-secret"), {
      target: { value: "old-secret" },
    });

    expect(screen.queryByText("currentPasswordIncorrectError")).not.toBeInTheDocument();
  });

  it("does not submit twice while password change is pending", async () => {
    const { passwordChangePromise, resolvePasswordChange } = createDeferredPasswordChange();
    walletService.changeWalletPassword.mockReturnValue(passwordChangePromise);
    render(<WalletPasswordCard />);

    fillPasswordForm();
    fireEvent.click(screen.getByText("submitButton"));
    fireEvent.click(screen.getByText("submitButton"));

    expect(walletService.changeWalletPassword).toHaveBeenCalledTimes(1);

    resolvePasswordChange({ message: "Wallet password updated" });
    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith({
        color: "success",
        description: "successToast",
      });
    });
  });

  it("toggles password field visibility", () => {
    render(<WalletPasswordCard />);

    const currentPasswordInput = screen.getByLabelText("currentPasswordLabel");
    expect(currentPasswordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByLabelText("toggleCurrentPassword"));

    expect(currentPasswordInput).toHaveAttribute("type", "text");
  });
});
