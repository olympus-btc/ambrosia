import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

import { CategorySelector } from "../CategorySelector";

jest.mock("next-intl", () => ({
  useTranslations: () => (key, values) => {
    if (key === "modal.createCategoryOption") {
      return `+ Create "${values.name}"`;
    }

    return key;
  },
}));

jest.mock("@heroui/react", () => ({
  Autocomplete: ({
    children,
    label,
    inputValue = "",
    onInputChange,
    onSelectionChange,
    isLoading,
  }) => {
    const React = jest.requireActual("react");
    const items = React.Children.toArray(children);

    return (
      <div>
        <input
          aria-label={label}
          value={inputValue}
          onChange={(e) => onInputChange?.(e.target.value)}
          disabled={isLoading}
        />
        <div>
          {items.map((child) => (
            <button
              key={child.key}
              type="button"
              onClick={() => {
                onSelectionChange?.(
                  child.props["data-create-value"]
                    ? `create:${child.props["data-create-value"]}`
                    : child.props["data-category-id"],
                );
              }}
            >
              {child.props.children}
            </button>
          ))}
        </div>
      </div>
    );
  },
  AutocompleteItem: ({ children }) => children,
  Chip: ({ children, onClose }) => (
    <button type="button" onClick={onClose}>
      {children}
    </button>
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
  it("renders the combobox", () => {
    renderSelector();

    expect(screen.getByLabelText("modal.productCategoryLabel")).toBeInTheDocument();
  });

  it("renders categories as options", () => {
    renderSelector();

    expect(screen.getByText("Category 1")).toBeInTheDocument();
    expect(screen.getByText("Category 2")).toBeInTheDocument();
  });

  it("disables combobox when categoriesLoading is true", () => {
    renderSelector({ categoriesLoading: true });

    const combobox = screen.getByLabelText("modal.productCategoryLabel");
    expect(combobox).toBeDisabled();
  });

  it("calls onSelectionChange when selection changes", () => {
    const onSelectionChange = jest.fn();
    renderSelector({ onSelectionChange });

    fireEvent.click(screen.getByText("Category 1"));

    expect(onSelectionChange).toHaveBeenCalledWith(["cat-1"]);
  });

  it("shows and creates a missing category", async () => {
    const onSelectionChange = jest.fn();
    const createCategory = jest.fn(() => Promise.resolve("cat-3"));
    renderSelector({
      onSelectionChange,
      createCategory,
      selectedCategories: ["cat-1"],
    });

    fireEvent.change(screen.getByLabelText("modal.productCategoryLabel"), { target: { value: "New Category" } });

    await act(async () => {
      fireEvent.click(screen.getByText('+ Create "New Category"'));
    });

    expect(createCategory).toHaveBeenCalledWith("New Category");
    expect(onSelectionChange).toHaveBeenCalledWith(["cat-1", "cat-3"]);
  });

  it("clears the search input after successful category creation", async () => {
    renderSelector();

    const input = screen.getByLabelText("modal.productCategoryLabel");
    fireEvent.change(input, { target: { value: "New Category" } });

    await act(async () => {
      fireEvent.click(screen.getByText('+ Create "New Category"'));
    });

    await waitFor(() => expect(input.value).toBe(""));
  });

  it("does not call createCategory if typed value is only whitespace", async () => {
    const createCategory = jest.fn();
    renderSelector({ createCategory });

    fireEvent.change(screen.getByLabelText("modal.productCategoryLabel"), { target: { value: "   " } });

    await act(async () => {
      fireEvent.click(screen.getByText("Category 1"));
    });

    expect(createCategory).not.toHaveBeenCalled();
  });

  it("does not call onSelectionChange if createCategory returns no id", async () => {
    const onSelectionChange = jest.fn();
    const createCategory = jest.fn(() => Promise.resolve(null));
    renderSelector({ onSelectionChange, createCategory });

    fireEvent.change(screen.getByLabelText("modal.productCategoryLabel"), { target: { value: "New Category" } });

    await act(async () => {
      fireEvent.click(screen.getByText('+ Create "New Category"'));
    });

    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("hides the create option when the typed category already exists", () => {
    renderSelector();

    fireEvent.change(screen.getByLabelText("modal.productCategoryLabel"), { target: { value: "Category 1" } });

    expect(screen.queryByText('+ Create "Category 1"')).not.toBeInTheDocument();
  });

  it("renders selected categories as removable chips", () => {
    renderSelector({ selectedCategories: ["cat-1", "cat-2"] });

    expect(screen.getAllByText("Category 1")).toHaveLength(2);
    expect(screen.getAllByText("Category 2")).toHaveLength(2);
  });

  it("removes a selected category chip", () => {
    const onSelectionChange = jest.fn();
    renderSelector({
      onSelectionChange,
      selectedCategories: ["cat-1", "cat-2"],
    });

    fireEvent.click(screen.getAllByText("Category 1")[1]);

    expect(onSelectionChange).toHaveBeenCalledWith(["cat-2"]);
  });

  it("prunes deleted category ids from selection when categories change", async () => {
    const onSelectionChange = jest.fn();
    renderSelector({
      onSelectionChange,
      selectedCategories: ["cat-1", "deleted-cat"],
    });

    await waitFor(() => expect(onSelectionChange).toHaveBeenCalledWith(["cat-1"]));
    expect(screen.queryByText("deleted-cat")).not.toBeInTheDocument();
  });
});
