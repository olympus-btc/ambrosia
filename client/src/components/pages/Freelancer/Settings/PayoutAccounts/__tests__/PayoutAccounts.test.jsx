import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useCurrencies, usePayoutAccounts } from "../../../hooks";
import { PayoutAccounts } from "../PayoutAccounts";

jest.mock("@/hooks/usePermission");

jest.mock("../../../hooks", () => ({
  usePayoutAccounts: jest.fn(),
  useCurrencies: jest.fn(),
}));

jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  addToast: jest.fn(),
}));

jest.mock("../PayoutAccountModal", () => ({
  PayoutAccountModal: ({ isOpen, payoutAccount, onSave, onClose }) => (isOpen ? (
    <div>
      <span>{payoutAccount ? `editing ${payoutAccount.id}` : "creating"}</span>
      <button type="button" onClick={() => onSave({ id: payoutAccount?.id ?? null, type: "lightning" })}>save payout account</button>
      <button type="button" onClick={onClose}>close payout account</button>
    </div>
  ) : null),
}));

const { addToast } = jest.requireMock("@heroui/react");

const aliceBankAccount = { id: "alice-bank-account", type: "bank", accountHolder: "Alice", bankName: "BBVA", clabe: "012180001234567890" };
const mockCreatePayoutAccount = jest.fn();
const mockUpdatePayoutAccount = jest.fn();
const mockDeletePayoutAccount = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useCurrencies.mockReturnValue({ currencies: [] });
  usePayoutAccounts.mockReturnValue({
    payoutAccounts: [aliceBankAccount],
    loading: false,
    error: null,
    createPayoutAccount: mockCreatePayoutAccount,
    updatePayoutAccount: mockUpdatePayoutAccount,
    deletePayoutAccount: mockDeletePayoutAccount,
  });
});

describe("PayoutAccounts", () => {
  it("creates a payout account from the empty modal and confirms the save", async () => {
    const user = userEvent.setup();
    mockCreatePayoutAccount.mockResolvedValue({});
    render(<PayoutAccounts />);

    await user.click(screen.getByText("addButton"));
    expect(screen.getByText("creating")).toBeInTheDocument();
    await user.click(screen.getByText("save payout account"));

    await waitFor(() => expect(screen.queryByText("creating")).not.toBeInTheDocument());
    expect(mockCreatePayoutAccount).toHaveBeenCalledWith({ type: "lightning", lightningAddress: null });
    expect(addToast).toHaveBeenCalledWith({ title: "toasts.saveSuccess", color: "success" });
  });

  it("updates the selected payout account from the edit modal", async () => {
    const user = userEvent.setup();
    mockUpdatePayoutAccount.mockResolvedValue({});
    render(<PayoutAccounts />);

    await user.click(screen.getByLabelText("edit"));
    expect(screen.getByText("editing alice-bank-account")).toBeInTheDocument();
    await user.click(screen.getByText("save payout account"));

    await waitFor(() => {
      expect(mockUpdatePayoutAccount).toHaveBeenCalledWith("alice-bank-account", { type: "lightning", lightningAddress: null });
    });
    expect(mockCreatePayoutAccount).not.toHaveBeenCalled();
  });

  it("keeps the modal open and shows the generic save error", async () => {
    const user = userEvent.setup();
    mockCreatePayoutAccount.mockRejectedValue({ status: 400 });
    render(<PayoutAccounts />);

    await user.click(screen.getByText("addButton"));
    await user.click(screen.getByText("save payout account"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith({
        title: "toasts.saveErrorTitle",
        description: "toasts.saveErrorDescription",
        color: "danger",
      });
    });
    expect(screen.getByText("creating")).toBeInTheDocument();
  });

  it("asks for a Lightning address when the node has no active Lightning backend", async () => {
    const user = userEvent.setup();
    mockCreatePayoutAccount.mockRejectedValue({
      status: 409,
      responseMessage: "A Lightning address is required when no Lightning backend is active",
    });
    render(<PayoutAccounts />);

    await user.click(screen.getByText("addButton"));
    await user.click(screen.getByText("save payout account"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith({
        title: "toasts.lightningBackendUnavailableTitle",
        description: "toasts.lightningBackendUnavailableDescription",
        color: "danger",
      });
    });
  });

  it("shows the generic save error for a conflict unrelated to the Lightning backend", async () => {
    const user = userEvent.setup();
    mockCreatePayoutAccount.mockRejectedValue({ status: 409, responseMessage: "Secrets are locked" });
    render(<PayoutAccounts />);

    await user.click(screen.getByText("addButton"));
    await user.click(screen.getByText("save payout account"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith({
        title: "toasts.saveErrorTitle",
        description: "toasts.saveErrorDescription",
        color: "danger",
      });
    });
  });

  it("sends a single deletion when the confirm button is pressed twice", async () => {
    const user = userEvent.setup();
    let resolvePendingDeletion;
    mockDeletePayoutAccount.mockReturnValue(new Promise((resolveDeletion) => {
      resolvePendingDeletion = resolveDeletion;
    }));
    render(<PayoutAccounts />);

    await user.click(screen.getByLabelText("delete"));
    const confirmDeleteButton = await screen.findByText("deleteModal.deleteButton");
    await user.click(confirmDeleteButton);
    await user.click(confirmDeleteButton);
    resolvePendingDeletion({});

    await waitFor(() => expect(addToast).toHaveBeenCalledWith({ title: "toasts.deleteSuccess", color: "success" }));
    expect(mockDeletePayoutAccount).toHaveBeenCalledTimes(1);
  });

  it("deletes the payout account after confirming", async () => {
    const user = userEvent.setup();
    mockDeletePayoutAccount.mockResolvedValue({});
    render(<PayoutAccounts />);

    await user.click(screen.getByLabelText("delete"));
    await user.click(await screen.findByText("deleteModal.deleteButton"));

    await waitFor(() => expect(mockDeletePayoutAccount).toHaveBeenCalledWith("alice-bank-account"));
    expect(addToast).toHaveBeenCalledWith({ title: "toasts.deleteSuccess", color: "success" });
  });

  it("shows the delete error when deleting fails", async () => {
    const user = userEvent.setup();
    mockDeletePayoutAccount.mockRejectedValue({ status: 404 });
    render(<PayoutAccounts />);

    await user.click(screen.getByLabelText("delete"));
    await user.click(await screen.findByText("deleteModal.deleteButton"));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith({
        title: "toasts.deleteErrorTitle",
        description: "toasts.deleteErrorDescription",
        color: "danger",
      });
    });
  });

  it("shows the load error from the hook", () => {
    usePayoutAccounts.mockReturnValue({
      payoutAccounts: [],
      loading: false,
      error: new Error("Network down"),
      createPayoutAccount: mockCreatePayoutAccount,
      updatePayoutAccount: mockUpdatePayoutAccount,
      deletePayoutAccount: mockDeletePayoutAccount,
    });
    render(<PayoutAccounts />);

    expect(screen.getByText("loadError")).toBeInTheDocument();
  });
});
