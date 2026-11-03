import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import * as secretsService from "@/services/secretsService";

import { CartPaymentSection } from "../CartPaymentSection";

jest.mock("../../hooks/usePaymentMethod", () => ({
  usePaymentMethods: () => ({
    paymentMethods: [
      { id: "cash", name: "Cash" },
      { id: "btc", name: "BTC" },
    ],
  }),
}));

jest.mock("@/services/secretsService", () => ({
  ...jest.requireActual("@/services/secretsService"),
  getSecretsLockStatus: jest.fn(),
}));

jest.mock("@components/shared/SecretsUnlockModal", () => ({
  SecretsUnlockModal: ({ onClose }) => (
    <div>
      <span>secrets-unlock-modal</span>
      <button type="button" onClick={onClose}>close</button>
    </div>
  ),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return {
    ...actual,
    Select: ({ label, selectedKeys, onSelectionChange, children, isDisabled }) => (
      <select
        aria-label={label}
        disabled={isDisabled}
        value={selectedKeys?.[0] || ""}
        onChange={(e) => onSelectionChange?.(new Set([e.target.value]))}
      >
        <option value="">placeholder</option>
        {children}
      </select>
    ),
    SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
  };
});

const defaultProps = {
  isPaying: false,
  isDisabled: false,
  paymentError: "",
  onClearPaymentError: jest.fn(),
  onPay: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  secretsService.getSecretsLockStatus.mockResolvedValue({ encryptionActive: false, locked: false });
});

describe("CartPaymentSection", () => {
  it("selects BTC as default payment method", async () => {
    render(<CartPaymentSection {...defaultProps} />);
    await waitFor(() => expect(secretsService.getSecretsLockStatus).toHaveBeenCalled());

    expect(screen.getByLabelText("summary.paymentMethodLabel")).toHaveValue("btc");
  });

  it("calls onPay with the selected payment method when Pay is pressed", async () => {
    const onPay = jest.fn();
    render(<CartPaymentSection {...defaultProps} onPay={onPay} />);
    await waitFor(() => expect(secretsService.getSecretsLockStatus).toHaveBeenCalled());

    fireEvent.click(screen.getByText("summary.pay"));
    expect(onPay).toHaveBeenCalledWith("btc");
  });

  it("shows payment error when provided", async () => {
    render(<CartPaymentSection {...defaultProps} paymentError="payment.error" />);
    await waitFor(() => expect(secretsService.getSecretsLockStatus).toHaveBeenCalled());

    expect(screen.getByText("payment.error")).toBeInTheDocument();
  });

  it("calls onClearPaymentError when payment method changes", async () => {
    const onClearPaymentError = jest.fn();
    render(<CartPaymentSection {...defaultProps} onClearPaymentError={onClearPaymentError} />);
    await waitFor(() => expect(secretsService.getSecretsLockStatus).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("summary.paymentMethodLabel"), { target: { value: "cash" } });
    expect(onClearPaymentError).toHaveBeenCalled();
  });

  it("disables Pay button when isDisabled is true", async () => {
    render(<CartPaymentSection {...defaultProps} isDisabled />);
    await waitFor(() => expect(secretsService.getSecretsLockStatus).toHaveBeenCalled());

    expect(screen.getByText("summary.pay")).toBeDisabled();
  });

  describe("when secrets are locked and BTC is selected", () => {
    it("shows the unlock label instead of Pay", async () => {
      secretsService.getSecretsLockStatus.mockResolvedValue({ encryptionActive: true, locked: true });
      render(<CartPaymentSection {...defaultProps} />);

      await waitFor(() => expect(screen.getByText("secretsEncryptionCard.unlockButton")).toBeInTheDocument());

      expect(screen.queryByText("summary.pay")).not.toBeInTheDocument();
    });

    it("opens the unlock modal instead of paying when clicked", async () => {
      secretsService.getSecretsLockStatus.mockResolvedValue({ encryptionActive: true, locked: true });
      const onPay = jest.fn();
      render(<CartPaymentSection {...defaultProps} onPay={onPay} />);
      await waitFor(() => expect(screen.getByText("secretsEncryptionCard.unlockButton")).toBeInTheDocument());

      fireEvent.click(screen.getByText("secretsEncryptionCard.unlockButton"));

      expect(onPay).not.toHaveBeenCalled();
      expect(screen.getByText("secrets-unlock-modal")).toBeInTheDocument();
    });

    it("does not show the unlock label when a non-BTC method is selected", async () => {
      secretsService.getSecretsLockStatus.mockResolvedValue({ encryptionActive: true, locked: true });
      render(<CartPaymentSection {...defaultProps} />);
      await waitFor(() => expect(screen.getByText("secretsEncryptionCard.unlockButton")).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText("summary.paymentMethodLabel"), { target: { value: "cash" } });

      expect(screen.getByText("summary.pay")).toBeInTheDocument();
      expect(screen.queryByText("secretsEncryptionCard.unlockButton")).not.toBeInTheDocument();
    });
  });
});
