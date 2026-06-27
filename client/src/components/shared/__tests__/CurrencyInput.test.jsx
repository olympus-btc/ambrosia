import { render, screen, fireEvent } from "@testing-library/react";

import { CurrencyInput } from "../CurrencyInput";

jest.mock("@heroui/react", () => ({
  Autocomplete: ({
    children,
    label,
    onSelectionChange,
    selectedKey,
    defaultSelectedKey,
    defaultFilter,
  }) => {
    const [inputValue, setInputValue] = require("react").useState("");
    const filteredChildren = require("react").Children.toArray(children).filter((child) => (
      !inputValue || defaultFilter(child.props.textValue, inputValue)
    ));

    return (
      <div>
        <label htmlFor="currency-search">{label}</label>
        <input
          id="currency-search"
          aria-label={label}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
        />
        <select
          aria-label={`${label} options`}
          value={selectedKey ?? defaultSelectedKey ?? ""}
          onChange={(event) => onSelectionChange(event.target.value)}
        >
          <option value="">Select currency</option>
          {filteredChildren}
        </select>
      </div>
    );
  },
  AutocompleteItem: ({ children, textValue }) => {
    const code = textValue ? textValue.split(" ")[0] : children.toString().split(" ")[0];
    return <option value={code}>{textValue || children}</option>;
  },
}));

const currencies = [
  { code: "USD", name: "United States Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "MXN", name: "Mexican Peso" },
];

describe("CurrencyInput", () => {
  it("filters currencies by currency name", () => {
    render(
      <CurrencyInput
        currencies={currencies}
        label="Currency"
        selectedKey="USD"
        onSelectionChange={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "mex" } });

    expect(screen.getByRole("option", { name: "MXN - Mexican Peso" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "USD - United States Dollar" })).not.toBeInTheDocument();
  });

  it("calls onSelectionChange when a currency is selected", () => {
    const onSelectionChange = jest.fn();
    render(
      <CurrencyInput
        currencies={currencies}
        label="Currency"
        selectedKey="USD"
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Currency options"), { target: { value: "MXN" } });

    expect(onSelectionChange).toHaveBeenCalledWith("MXN");
  });
});
