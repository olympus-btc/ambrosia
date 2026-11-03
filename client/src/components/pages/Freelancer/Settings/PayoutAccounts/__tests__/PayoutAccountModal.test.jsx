import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PayoutAccountModal } from "../PayoutAccountModal";

jest.mock("@heroui/react", () => {
  const actualHeroUI = jest.requireActual("@heroui/react");
  const { Children } = jest.requireActual("react");
  const Select = ({ label: selectLabel, selectedKeys, onChange: onSelectChange, children: selectItems }) => (
    <select aria-label={selectLabel} value={selectedKeys[0]} onChange={onSelectChange}>
      {Children.toArray(selectItems).map((selectItem) => {
        const optionValue = String(selectItem.key).replace(/^\.\$/, "");
        return <option key={optionValue} value={optionValue}>{selectItem.props.children}</option>;
      })}
    </select>
  );
  const SelectItem = () => null;
  return { ...actualHeroUI, Select, SelectItem };
});

jest.mock("@components/shared/CurrencyInput", () => ({
  CurrencyInput: ({ label: currencyInputLabel, currencies: currencyOptions, selectedKey, onSelectionChange }) => (
    <select aria-label={currencyInputLabel} value={selectedKey ?? ""} onChange={(changeEvent) => onSelectionChange(changeEvent.target.value)}>
      <option value="" />
      {currencyOptions.map((currencyOption) => (
        <option key={currencyOption.code} value={currencyOption.code}>{currencyOption.name}</option>
      ))}
    </select>
  ),
}));

const currencies = [{ id: "currency-mxn", acronym: "MXN", name: "Mexican Peso" }];

function renderModal(modalProps = {}) {
  return render(
    <PayoutAccountModal
      payoutAccount={null}
      currencies={currencies}
      isOpen
      onClose={jest.fn()}
      onSave={jest.fn().mockResolvedValue(undefined)}
      {...modalProps}
    />,
  );
}

describe("PayoutAccountModal", () => {
  it("shows the create title and the bank fields for a new payout account", () => {
    renderModal();

    expect(screen.getByText("modal.createTitle")).toBeInTheDocument();
    expect(screen.getByLabelText("fields.accountHolder")).toBeInTheDocument();
    expect(screen.getByLabelText("fields.currency")).toBeInTheDocument();
    expect(screen.queryByLabelText("fields.lightningAddress")).not.toBeInTheDocument();
  });

  it("keeps saving disabled until the bank account is complete and saves it with the currency id", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    renderModal({ onSave });

    const saveButton = screen.getByText("modal.saveButton").closest("button");
    expect(saveButton).toBeDisabled();

    await user.type(screen.getByLabelText("fields.accountHolder"), "Alice");
    await user.type(screen.getByLabelText("fields.bankName"), "BBVA");
    await user.type(screen.getByLabelText("fields.clabe"), "012180001234567890");
    await user.selectOptions(screen.getByLabelText("fields.currency"), "MXN");
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        type: "bank",
        accountHolder: "Alice",
        bankName: "BBVA",
        clabe: "012180001234567890",
        currencyId: "currency-mxn",
      }));
    });
  });

  it("switches to the lightning address field when the lightning type is selected", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    renderModal({ onSave });

    await user.selectOptions(screen.getByLabelText("fields.type"), "lightning");
    await user.type(screen.getByLabelText("fields.lightningAddress"), "bob@getalby.com");
    await user.click(screen.getByText("modal.saveButton"));

    expect(screen.queryByLabelText("fields.accountHolder")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: "lightning", lightningAddress: "bob@getalby.com" }));
    });
  });

  it("shows the edit title and the existing values when editing", () => {
    renderModal({ payoutAccount: { id: "bob-lightning-account", type: "lightning", lightningAddress: "bob@getalby.com" } });

    expect(screen.getByText("modal.editTitle")).toBeInTheDocument();
    expect(screen.getByLabelText("fields.lightningAddress")).toHaveValue("bob@getalby.com");
  });

  it("calls onClose when cancel is pressed", async () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    await userEvent.click(screen.getByText("modal.cancelButton"));

    expect(onClose).toHaveBeenCalled();
  });
});
