import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ClientFormModal } from "../ClientFormModal";

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey) => translationKey,
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, isDisabled, isLoading, onPress, type = "button" }) => (
    <button type={type} disabled={isDisabled || isLoading} onClick={onPress}>
      {children}
    </button>
  ),
  Chip: ({ children, onClose }) => (
    <span>
      {children}
      {onClose && (
        <button type="button" aria-label={`remove ${children}`} onClick={onClose}>
          remove
        </button>
      )}
    </span>
  ),
  Input: ({ label, value, onChange }) => (
    <label>
      {label}
      <input value={value} onChange={onChange} />
    </label>
  ),
  Modal: ({ children, isOpen }) => (isOpen ? <div>{children}</div> : null),
  ModalBody: ({ children }) => <div>{children}</div>,
  ModalContent: ({ children }) => <div>{children}</div>,
  ModalFooter: ({ children }) => <div>{children}</div>,
  ModalHeader: ({ children }) => <h2>{children}</h2>,
  NumberInput: ({ label, value, onValueChange }) => (
    <label>
      {label}
      <input
        type="number"
        value={value}
        onChange={(numberInputChangeEvent) => onValueChange(Number(numberInputChangeEvent.target.value))}
      />
    </label>
  ),
  Select: ({ children, errorMessage, isInvalid, label, onSelectionChange, selectedKeys = [] }) => {
    const React = jest.requireActual("react");
    const selectItems = React.Children.toArray(children);

    return (
      <label>
        {label}
        <select
          value={Array.from(selectedKeys)[0] || ""}
          onChange={(selectChangeEvent) => onSelectionChange?.([selectChangeEvent.target.value])}
        >
          <option value="">select</option>
          {selectItems.map((selectItem) => (
            <option key={selectItem.key} value={selectItem.key?.replace(".$", "")}>
              {selectItem.props.children}
            </option>
          ))}
        </select>
        {isInvalid && errorMessage ? <span>{errorMessage}</span> : null}
      </label>
    );
  },
  SelectItem: ({ children }) => <>{children}</>,
}));

const defaultClientForm = {
  id: "",
  name: "Acme",
  currencyId: "currency-1",
  hourlyRateCents: 7500,
  billingCycle: "monthly",
  paymentMethods: ["bank"],
};

const currencies = [{ id: "currency-1", acronym: "USD", name: "US Dollar" }];

function renderClientFormModal(clientFormOverrides = {}) {
  const onChange = jest.fn();
  const onSubmit = jest.fn();
  const onClose = jest.fn();

  render(
    <ClientFormModal
      clientForm={{ ...defaultClientForm, ...clientFormOverrides }}
      currencies={currencies}
      isOpen
      mode="add"
      onChange={onChange}
      onClose={onClose}
      onSubmit={onSubmit}
    />,
  );

  return { onChange, onClose, onSubmit };
}

describe("ClientFormModal", () => {
  it("adds payment methods one at a time", async () => {
    const user = userEvent.setup();
    const { onChange } = renderClientFormModal();

    await user.selectOptions(screen.getByLabelText("modal.paymentMethodsLabel"), "lightning");
    await user.click(screen.getByRole("button", { name: "modal.addPaymentMethodButton" }));

    expect(onChange).toHaveBeenCalledWith({ paymentMethods: ["bank", "lightning"] });
  });

  it("removes a selected payment method chip", async () => {
    const user = userEvent.setup();
    const { onChange } = renderClientFormModal({ paymentMethods: ["bank", "lightning"] });

    await user.click(screen.getByRole("button", { name: "remove paymentMethods.bank" }));

    expect(onChange).toHaveBeenCalledWith({ paymentMethods: ["lightning"] });
  });

  it("disables submit when no payment method is selected", () => {
    renderClientFormModal({ paymentMethods: [] });

    expect(screen.getByRole("button", { name: "modal.submitButton" })).toBeDisabled();
    expect(screen.getByText("modal.paymentMethodsError")).toBeInTheDocument();
  });
});
