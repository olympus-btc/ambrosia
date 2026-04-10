import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

import { CategorySelector } from "../CategorySelector";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, isLoading, ...props }) => (
    <button onClick={onPress} disabled={isLoading} {...props}>
      {isLoading ? "loading" : children}
    </button>
  ),
  Input: ({ label, value, onChange, placeholder }) => (
    <input
      aria-label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
  Select: ({ children, label, selectedKeys, onSelectionChange, isLoading, isRequired }) => (
    <div>
      <label>{label}</label>
      <select
        aria-label={label}
        multiple
        required={isRequired}
        disabled={isLoading}
        onChange={(e) => onSelectionChange(new Set([e.target.value]))}
        value={Array.from(selectedKeys || [])}
      >
        {children}
      </select>
    </div>
  ),
  SelectItem: ({ children, value }) => (
    <option value={value}>{children}</option>
  ),
}));

const categories = [
  { id: "cat-1", name: "Category 1" },
  { id: "cat-2", name: "Category 2" },
];

const defaultProps = {
  categories,
  categoriesLoading: false,
  selectedCategories: [],
  onSelectionChange: jest.fn(),
  createCategory: jest.fn(() => Promise.resolve("cat-3")),
};

function renderSelector(props = {}) {
  return render(<CategorySelector {...defaultProps} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CategorySelector", () => {
  it("renders the select and create category input", () => {
    renderSelector();

    expect(screen.getByLabelText("modal.productCategoryLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("modal.createCategoryLabel")).toBeInTheDocument();
    expect(screen.getByText("modal.createCategoryButton")).toBeInTheDocument();
  });

  it("renders categories as options", () => {
    renderSelector();

    expect(screen.getByText("Category 1")).toBeInTheDocument();
    expect(screen.getByText("Category 2")).toBeInTheDocument();
  });

  it("disables select when categoriesLoading is true", () => {
    renderSelector({ categoriesLoading: true });

    const select = screen.getByLabelText("modal.productCategoryLabel");
    expect(select).toBeDisabled();
  });

  it("calls onSelectionChange when selection changes", () => {
    const onSelectionChange = jest.fn();
    renderSelector({ onSelectionChange });

    const select = screen.getByLabelText("modal.productCategoryLabel");
    fireEvent.change(select, { target: { value: "cat-1" } });

    expect(onSelectionChange).toHaveBeenCalled();
  });

  it("updates input value as user types", () => {
    renderSelector();

    const input = screen.getByLabelText("modal.createCategoryLabel");
    fireEvent.change(input, { target: { value: "New Category" } });

    expect(input.value).toBe("New Category");
  });

  it("calls createCategory and onSelectionChange with new id on button press", async () => {
    const onSelectionChange = jest.fn();
    const createCategory = jest.fn(() => Promise.resolve("cat-3"));
    renderSelector({ onSelectionChange, createCategory, selectedCategories: ["cat-1"] });

    const input = screen.getByLabelText("modal.createCategoryLabel");
    fireEvent.change(input, { target: { value: "New Category" } });

    await act(async () => {
      fireEvent.click(screen.getByText("modal.createCategoryButton"));
    });

    expect(createCategory).toHaveBeenCalledWith("New Category");
    expect(onSelectionChange).toHaveBeenCalledWith(["cat-1", "cat-3"]);
  });

  it("clears input after successful category creation", async () => {
    renderSelector();

    const input = screen.getByLabelText("modal.createCategoryLabel");
    fireEvent.change(input, { target: { value: "New Category" } });

    await act(async () => {
      fireEvent.click(screen.getByText("modal.createCategoryButton"));
    });

    await waitFor(() => expect(input.value).toBe(""));
  });

  it("does not call createCategory if input is empty", async () => {
    const createCategory = jest.fn();
    renderSelector({ createCategory });

    await act(async () => {
      fireEvent.click(screen.getByText("modal.createCategoryButton"));
    });

    expect(createCategory).not.toHaveBeenCalled();
  });

  it("does not call createCategory if input is only whitespace", async () => {
    const createCategory = jest.fn();
    renderSelector({ createCategory });

    const input = screen.getByLabelText("modal.createCategoryLabel");
    fireEvent.change(input, { target: { value: "   " } });

    await act(async () => {
      fireEvent.click(screen.getByText("modal.createCategoryButton"));
    });

    expect(createCategory).not.toHaveBeenCalled();
  });

  it("does not call onSelectionChange if createCategory returns no id", async () => {
    const onSelectionChange = jest.fn();
    const createCategory = jest.fn(() => Promise.resolve(null));
    renderSelector({ onSelectionChange, createCategory });

    const input = screen.getByLabelText("modal.createCategoryLabel");
    fireEvent.change(input, { target: { value: "New Category" } });

    await act(async () => {
      fireEvent.click(screen.getByText("modal.createCategoryButton"));
    });

    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
