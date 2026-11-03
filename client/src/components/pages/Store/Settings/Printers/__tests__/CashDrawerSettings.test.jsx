import { addToast } from "@heroui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { CashDrawerSettings } from "../CashDrawerSettings";

const mockOpenCashDrawer = jest.fn();
jest.mock("@/hooks/useCashDrawer", () => ({
  useCashDrawer: () => ({ openCashDrawer: mockOpenCashDrawer }),
}));

let mockCanOpenCashDrawer = true;
jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children: permittedContent }) => (mockCanOpenCashDrawer ? permittedContent : null),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey) => translationKey,
}));

jest.mock("@/hooks/usePaymentMethodLabel", () => ({
  usePaymentMethodLabel: () => ({ getPaymentMethodLabel: (paymentMethodName) => `label-${paymentMethodName}` }),
}));

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ onPress: onButtonPress, children: buttonContent }) => (
    <button type="button" onClick={onButtonPress}>{buttonContent}</button>
  ),
  Switch: ({ isSelected: isSwitchSelected, onValueChange: onSwitchValueChange, children: switchLabel }) => (
    <label>
      <input
        type="checkbox"
        checked={!!isSwitchSelected}
        onChange={(switchChangeEvent) => onSwitchValueChange(switchChangeEvent.target.checked)}
      />
      {switchLabel}
    </label>
  ),
  Select: ({ label: selectLabel, children: selectOptions, onChange: onSelectChange, selectedKeys: selectedOptionKeys }) => (
    <label>
      {selectLabel}
      <select aria-label={selectLabel} onChange={onSelectChange} value={(selectedOptionKeys && selectedOptionKeys[0]) ?? ""}>
        {selectOptions}
      </select>
    </label>
  ),
  SelectItem: ({ value: optionValue, children: optionLabel }) => <option value={optionValue}>{optionLabel}</option>,
  CheckboxGroup: ({
    label: checkboxGroupLabel,
    value: selectedPaymentMethodIds,
    onValueChange: onSelectedPaymentMethodIdsChange,
    children: paymentMethodCheckboxes,
  }) => (
    <fieldset aria-label={checkboxGroupLabel}>
      {paymentMethodCheckboxes.map((paymentMethodCheckbox) => {
        const paymentMethodId = paymentMethodCheckbox.props.value;
        return (
          <label key={paymentMethodId}>
            <input
              type="checkbox"
              checked={selectedPaymentMethodIds.includes(paymentMethodId)}
              onChange={(checkboxChangeEvent) => onSelectedPaymentMethodIdsChange(
                checkboxChangeEvent.target.checked
                  ? [...selectedPaymentMethodIds, paymentMethodId]
                  : selectedPaymentMethodIds.filter((selectedPaymentMethodId) => selectedPaymentMethodId !== paymentMethodId),
              )}
            />
            {paymentMethodCheckbox.props.children}
          </label>
        );
      })}
    </fieldset>
  ),
  Checkbox: ({ children: checkboxLabel }) => <span>{checkboxLabel}</span>,
}));

const paymentMethods = [
  { id: "method-cash", name: "Cash" },
  { id: "method-card", name: "Credit Card" },
];

const cashDrawerConfig = {
  id: "cfg-1",
  cashDrawerEnabled: true,
  cashDrawerPin: "PIN_2",
  cashDrawerPaymentMethodIds: ["method-cash"],
  openCashDrawerOnRefund: true,
  openCashDrawerOnShiftOpen: true,
  openCashDrawerOnShiftClose: true,
};

function renderSettings(printerCashDrawerConfig, onCashDrawerChange = jest.fn()) {
  render(
    <CashDrawerSettings printerConfig={printerCashDrawerConfig} paymentMethods={paymentMethods} onCashDrawerChange={onCashDrawerChange} />,
  );
  return onCashDrawerChange;
}

beforeEach(() => {
  mockOpenCashDrawer.mockReset();
  addToast.mockClear();
  mockCanOpenCashDrawer = true;
});

describe("CashDrawerSettings", () => {
  it("only shows the connected switch while the cash drawer is off", () => {
    renderSettings({ ...cashDrawerConfig, cashDrawerEnabled: false });

    expect(screen.getByText("cardPrinters.cashDrawer.enabledLabel")).toBeInTheDocument();
    expect(screen.queryByLabelText("cardPrinters.cashDrawer.pinLabel")).not.toBeInTheDocument();
  });

  it("preselects the cash payment methods when turning the cash drawer on for the first time", () => {
    const onCashDrawerChange = renderSettings({ ...cashDrawerConfig, cashDrawerEnabled: false, cashDrawerPaymentMethodIds: [] });

    fireEvent.click(screen.getByRole("checkbox"));

    expect(onCashDrawerChange).toHaveBeenCalledWith({ cashDrawerEnabled: true, cashDrawerPaymentMethodIds: ["method-cash"] });
  });

  it("keeps the saved payment methods when turning the cash drawer on again", () => {
    const onCashDrawerChange = renderSettings({ ...cashDrawerConfig, cashDrawerEnabled: false, cashDrawerPaymentMethodIds: ["method-card"] });

    fireEvent.click(screen.getByRole("checkbox"));

    expect(onCashDrawerChange).toHaveBeenCalledWith({ cashDrawerEnabled: true });
  });

  it("changes the pin", () => {
    const onCashDrawerChange = renderSettings(cashDrawerConfig);

    fireEvent.change(screen.getByLabelText("cardPrinters.cashDrawer.pinLabel"), { target: { value: "PIN_5" } });

    expect(onCashDrawerChange).toHaveBeenCalledWith({ cashDrawerPin: "PIN_5" });
  });

  it("lists the translated payment methods and saves the selected ones", () => {
    const onCashDrawerChange = renderSettings(cashDrawerConfig);

    expect(screen.getByText("label-Cash")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("label-Credit Card"));

    expect(onCashDrawerChange).toHaveBeenCalledWith({ cashDrawerPaymentMethodIds: ["method-cash", "method-card"] });
  });

  it("saves the refund and shift switches", () => {
    const onCashDrawerChange = renderSettings(cashDrawerConfig);

    fireEvent.click(screen.getByLabelText("cardPrinters.cashDrawer.openOnShiftClose"));

    expect(onCashDrawerChange).toHaveBeenCalledWith({ openCashDrawerOnShiftClose: false });
  });

  it("tests the cash drawer of this printer and confirms it", async () => {
    mockOpenCashDrawer.mockResolvedValue(undefined);
    renderSettings(cashDrawerConfig);

    fireEvent.click(screen.getByText("cardPrinters.cashDrawer.testButton"));

    expect(mockOpenCashDrawer).toHaveBeenCalledWith("cfg-1");
    await waitFor(() => expect(addToast).toHaveBeenCalledWith({ color: "success", description: "cardPrinters.cashDrawer.testSuccess" }));
  });

  it("shows an error when the cash drawer test fails", async () => {
    mockOpenCashDrawer.mockRejectedValue(new Error("cash_drawer_not_opened"));
    renderSettings(cashDrawerConfig);

    fireEvent.click(screen.getByText("cardPrinters.cashDrawer.testButton"));

    await waitFor(() => expect(addToast).toHaveBeenCalledWith({ color: "danger", description: "cardPrinters.cashDrawer.testError" }));
  });

  it("hides the cash drawer test without the cash_drawer_open permission", () => {
    mockCanOpenCashDrawer = false;
    renderSettings(cashDrawerConfig);

    expect(screen.queryByText("cardPrinters.cashDrawer.testButton")).not.toBeInTheDocument();
  });
});
