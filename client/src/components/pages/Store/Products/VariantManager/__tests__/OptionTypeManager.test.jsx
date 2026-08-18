import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { OptionTypeManager } from "../OptionTypeManager";

const mockAddToast = jest.fn();
jest.mock("@heroui/react", () => ({
  addToast: (...toastArguments) => mockAddToast(...toastArguments),
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

const defaultOptionTypeManagerProps = {
  productId: "p1",
  optionTypes: [],
  optionTypeActions: {
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  onRefresh: jest.fn(),
};

function renderManager({ optionTypeActions = {}, ...optionTypeManagerProps } = {}) {
  return render(
    <OptionTypeManager
      {...defaultOptionTypeManagerProps}
      {...optionTypeManagerProps}
      optionTypeActions={{ ...defaultOptionTypeManagerProps.optionTypeActions, ...optionTypeActions }}
    />,
  );
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
    renderManager({ optionTypes: options });
    expect(screen.queryByText("noOptionTypes")).not.toBeInTheDocument();
  });

  it("renders the option type name and its values", () => {
    renderManager({ optionTypes: options });
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
    const addOptionType = jest.fn().mockResolvedValue("ot-new");
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderManager({ optionTypeActions: { add: addOptionType }, onRefresh });

    fireEvent.click(screen.getByText("addOptionType"));

    fireEvent.change(screen.getByLabelText("optionTypeName"), { target: { value: "Size" } });

    const valueInput = screen.getByPlaceholderText("optionValuePlaceholder");
    fireEvent.change(valueInput, { target: { value: "M" } });
    fireEvent.keyDown(valueInput, { key: "Enter" });

    fireEvent.click(screen.getByText("saveVariant"));

    await waitFor(() => expect(addOptionType).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ name: "Size" }),
    ));
    expect(mockAddToast).toHaveBeenCalledWith({
      description: "toasts.optionTypeCreateSuccess",
      color: "success",
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it("does not call onAddOptionType when name is empty", () => {
    const addOptionType = jest.fn();
    renderManager({ optionTypeActions: { add: addOptionType } });

    fireEvent.click(screen.getByText("addOptionType"));
    fireEvent.click(screen.getByText("saveVariant"));

    expect(addOptionType).not.toHaveBeenCalled();
  });

  it("keeps form open when onAddOptionType returns falsy", async () => {
    const addOptionType = jest.fn().mockResolvedValue(null);
    renderManager({ optionTypeActions: { add: addOptionType } });

    fireEvent.click(screen.getByText("addOptionType"));
    fireEvent.change(screen.getByLabelText("optionTypeName"), { target: { value: "Size" } });

    const valueInput = screen.getByPlaceholderText("optionValuePlaceholder");
    fireEvent.change(valueInput, { target: { value: "M" } });
    fireEvent.keyDown(valueInput, { key: "Enter" });

    fireEvent.click(screen.getByText("saveVariant"));

    await waitFor(() => expect(addOptionType).toHaveBeenCalled());
    expect(mockAddToast).not.toHaveBeenCalled();
    expect(screen.getByLabelText("optionTypeName")).toBeInTheDocument();
  });

  it("calls onUpdateOptionType, closes the edit form, and shows a success toast", async () => {
    const updateOptionType = jest.fn().mockResolvedValue(true);
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderManager({ optionTypes: options, optionTypeActions: { update: updateOptionType }, onRefresh });

    fireEvent.click(screen.getByTestId("edit-option-type-ot1"));
    fireEvent.click(screen.getByText("saveVariant"));

    await waitFor(() => expect(updateOptionType).toHaveBeenCalledWith(
      "p1",
      "ot1",
      expect.objectContaining({ name: "Color" }),
    ));
    expect(mockAddToast).toHaveBeenCalledWith({
      description: "toasts.optionTypeUpdateSuccess",
      color: "success",
    });
    expect(onRefresh).toHaveBeenCalled();
    expect(screen.queryByLabelText("optionTypeName")).not.toBeInTheDocument();
  });

  it("switches to edit form when the edit button is clicked", () => {
    renderManager({ optionTypes: options });
    fireEvent.click(screen.getByTestId("edit-option-type-ot1"));
    expect(screen.getByLabelText("optionTypeName")).toBeInTheDocument();
  });

  it("calls onDeleteOptionType and refreshes on delete", async () => {
    const deleteOptionType = jest.fn().mockResolvedValue(true);
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    renderManager({ optionTypes: options, optionTypeActions: { delete: deleteOptionType }, onRefresh });

    fireEvent.click(screen.getByTestId("delete-option-type-ot1"));

    await waitFor(() => expect(deleteOptionType).toHaveBeenCalledWith("p1", "ot1"));
    expect(mockAddToast).toHaveBeenCalledWith({
      description: "toasts.optionTypeDeleteSuccess",
      color: "success",
    });
    expect(onRefresh).toHaveBeenCalled();
  });
});
