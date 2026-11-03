import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { usePermission } from "@/hooks/usePermission";

import { PayoutAccountsCard } from "../PayoutAccountsCard";

jest.mock("@/hooks/usePermission", () => ({
  usePermission: jest.fn(() => true),
  RequirePermission: ({ allOf, children: permittedContent }) => (jest.requireMock("@/hooks/usePermission").usePermission({ allOf }) ? permittedContent : null),
}));

const aliceBankAccount = {
  id: "alice-bank-account",
  type: "bank",
  accountHolder: "Alice",
  bankName: "BBVA",
  clabe: "012180001234567890",
};
const bobLightningAccount = { id: "bob-lightning-account", type: "lightning", lightningAddress: "bob@getalby.com" };
const nodeLightningAccount = { id: "node-lightning-account", type: "lightning", lightningAddress: null };

function renderCard(cardProps = {}) {
  return render(
    <PayoutAccountsCard
      payoutAccounts={[aliceBankAccount, bobLightningAccount, nodeLightningAccount]}
      isLoading={false}
      hasLoadError={false}
      onAdd={jest.fn()}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
      {...cardProps}
    />,
  );
}

describe("PayoutAccountsCard", () => {
  beforeEach(() => {
    usePermission.mockReturnValue(true);
  });

  it("lists bank and lightning payout accounts", () => {
    renderCard();

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("BBVA · 012180001234567890")).toBeInTheDocument();
    expect(screen.getByText("bob@getalby.com")).toBeInTheDocument();
    expect(screen.getByText("nodeLightningAddress")).toBeInTheDocument();
    expect(screen.getAllByText("types.lightning")).toHaveLength(2);
  });

  it("shows the empty message when there are no payout accounts", () => {
    renderCard({ payoutAccounts: [] });

    expect(screen.getByText("empty")).toBeInTheDocument();
  });

  it("shows the load error instead of the list", () => {
    renderCard({ hasLoadError: true });

    expect(screen.getByText("loadError")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("calls the row actions with the selected payout account", async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    renderCard({ payoutAccounts: [aliceBankAccount], onEdit, onDelete });

    await userEvent.click(screen.getByLabelText("edit"));
    await userEvent.click(screen.getByLabelText("delete"));

    expect(onEdit).toHaveBeenCalledWith(aliceBankAccount);
    expect(onDelete).toHaveBeenCalledWith(aliceBankAccount);
  });

  it("hides the add, edit and delete actions for a role without payout account write permissions", () => {
    usePermission.mockImplementation(({ allOf }) => !allOf.some((permissionName) => permissionName !== "payout_accounts_read"));
    renderCard();

    expect(screen.queryByText("addButton")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("edit")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("delete")).not.toBeInTheDocument();
  });
});
