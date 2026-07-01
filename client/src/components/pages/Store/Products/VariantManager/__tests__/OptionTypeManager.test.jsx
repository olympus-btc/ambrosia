import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { OptionTypeManager } from "../OptionTypeManager";

jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, isDisabled }) => (
    <button onClick={onPress} disabled={isDisabled}>
      {children}
    </button>
  ),
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  CardBody: ({ children, className }) => <div className={className}>{children}</div>,
  Chip: ({ children, endContent }) => (
    <span>
      {children}
      {endContent}
    </span>
  ),
  Input: ({ label, value, onChange, onKeyDown, placeholder }) => (
    <input
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  ),
}));

const options = [
  {
    id: "ot1",
    name: "Color",
    values: [
      { id: "val-red", value: "Red" },
      { id: "val-blue", value: "Blue" },
    ],
  },
];

const defaultProps = {
  productId: "p1",
  options: [],
  onAddOptionType: jest.fn(),
  onUpdateOptionType: jest.fn(),
  onDeleteOptionType: jest.fn(),
  onRefresh: jest.fn(),
};

function renderManager(props = {}) {
  return render(<OptionTypeManager {...defaultProps} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("OptionTypeManager", () => {
  it("shows empty-state message when there are no options", () => {
    renderManager();
    expect(screen.getByText("noOptionTypes")).toBeInTheDocument();
  });

  it("does not show empty-state when options exist", () => {
    renderManager({ options });
    expect(screen.queryByText("noOptionTypes")).not.toBeInTheDocument();
  });

  it("renders the option type name and its values", () => {
    renderManager({ options });
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
  });

  it("shows add-form when the add button is clicked", () => {
    renderManager();
    fireEvent.click(screen.getByText("addOptionType"));
    expect(screen.getByLabelText("optionTypeName")).toBeInTheDocument();
  });

  it("hides the add button while the form is open", () => {
    renderManager();
    fireEvent.click(screen.getByText("addOptionType"));
    expect(screen.queryByText("addOptionType")).not.toBeInTheDocument();
  });

  it("hides the form when cancel is clicked", () => {
    renderManager();
    fireEvent.click(screen.getByText("addOptionType"));
    fireEvent.click(screen.getByText("cancelVariant"));
    expect(screen.queryByLabelText("optionTypeName")).not.toBeInTheDocument();
  });

  it("calls onAddOptionType and closes form on successful save", async () => {
    const onAddOptionType = jest.fn().mockResolvedValue("ot-new");
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderManager({ onAddOptionType, onRefresh });

    fireEvent.click(screen.getByText("addOptionType"));

    fireEvent.change(screen.getByLabelText("optionTypeName"), { target: { value: "Size" } });

    const valueInput = screen.getByPlaceholderText("optionValuePlaceholder");
    fireEvent.change(valueInput, { target: { value: "M" } });
    fireEvent.keyDown(valueInput, { key: "Enter" });

    fireEvent.click(screen.getByText("saveVariant"));

    await waitFor(() => expect(onAddOptionType).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ name: "Size" }),
    ));
    expect(onRefresh).toHaveBeenCalled();
  });

  it("does not call onAddOptionType when name is empty", () => {
    const onAddOptionType = jest.fn();
    renderManager({ onAddOptionType });

    fireEvent.click(screen.getByText("addOptionType"));
    fireEvent.click(screen.getByText("saveVariant"));

    expect(onAddOptionType).not.toHaveBeenCalled();
  });

  it("keeps form open when onAddOptionType returns falsy", async () => {
    const onAddOptionType = jest.fn().mockResolvedValue(null);
    renderManager({ onAddOptionType });

    fireEvent.click(screen.getByText("addOptionType"));
    fireEvent.change(screen.getByLabelText("optionTypeName"), { target: { value: "Size" } });

    const valueInput = screen.getByPlaceholderText("optionValuePlaceholder");
    fireEvent.change(valueInput, { target: { value: "M" } });
    fireEvent.keyDown(valueInput, { key: "Enter" });

    fireEvent.click(screen.getByText("saveVariant"));

    await waitFor(() => expect(onAddOptionType).toHaveBeenCalled());
    expect(screen.getByLabelText("optionTypeName")).toBeInTheDocument();
  });

  it("switches to edit form when the edit button is clicked", () => {
    renderManager({ options });
    fireEvent.click(screen.getByTestId("edit-option-type-ot1"));
    expect(screen.getByLabelText("optionTypeName")).toBeInTheDocument();
  });

  it("calls onDeleteOptionType and refreshes on delete", async () => {
    const onDeleteOptionType = jest.fn().mockResolvedValue(true);
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderManager({ options, onDeleteOptionType, onRefresh });

    fireEvent.click(screen.getByTestId("delete-option-type-ot1"));

    await waitFor(() => expect(onDeleteOptionType).toHaveBeenCalledWith("p1", "ot1"));
    expect(onRefresh).toHaveBeenCalled();
  });
});
