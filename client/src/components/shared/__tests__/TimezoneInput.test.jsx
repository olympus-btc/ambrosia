import { render, screen, fireEvent } from "@testing-library/react";

import { TimezoneInput } from "../TimezoneInput";

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
    const items = Array.isArray(children) ? children : [children];
    const filteredItems = items.filter((child) => (
      !inputValue || defaultFilter(child.props.textValue, inputValue)
    ));

    return (
      <div>
        <label htmlFor="timezone-search">{label}</label>
        <input
          id="timezone-search"
          aria-label={label}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
        />
        <select
          aria-label={`${label} options`}
          value={selectedKey ?? defaultSelectedKey ?? ""}
          onChange={(event) => onSelectionChange(event.target.value)}
        >
          <option value="">Select timezone</option>
          {filteredItems.map((child) => (
            <option key={child.key} value={child.key}>{child.props.textValue}</option>
          ))}
        </select>
      </div>
    );
  },
  AutocompleteItem: ({ children }) => children,
}));

const timezones = [
  { zoneId: "America/Mexico_City", label: "America/Mexico City (GMT-6)" },
  { zoneId: "Europe/Madrid", label: "Europe/Madrid (GMT+1)" },
  { zoneId: "America/New_York", label: "America/New York (GMT-5)" },
];

describe("TimezoneInput", () => {
  it("filters timezones by label", () => {
    render(
      <TimezoneInput
        timezones={timezones}
        label="Timezone"
        selectedKey="America/Mexico_City"
        onSelectionChange={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Timezone"), { target: { value: "madrid" } });

    expect(screen.getByRole("option", { name: "Europe/Madrid (GMT+1)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "America/Mexico City (GMT-6)" })).not.toBeInTheDocument();
  });

  it("calls onSelectionChange with the zoneId when a timezone is selected", () => {
    const onSelectionChange = jest.fn();
    render(
      <TimezoneInput
        timezones={timezones}
        label="Timezone"
        selectedKey="America/Mexico_City"
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Timezone options"), { target: { value: "Europe/Madrid" } });

    expect(onSelectionChange).toHaveBeenCalledWith("Europe/Madrid");
  });
});
