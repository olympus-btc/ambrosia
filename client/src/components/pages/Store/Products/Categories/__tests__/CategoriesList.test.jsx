import { render, screen, fireEvent } from "@testing-library/react";

import { CategoriesList } from "../CategoriesList";

jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
}));

jest.mock("../CategoriesCard", () => ({
  CategoriesCard: ({ category, onEditCategory, onDeleteCategory }) => (
    <div data-testid={`card-${category.id}`}>
      <span>{category.name}</span>
      <button data-testid={`card-edit-${category.id}`} onClick={() => onEditCategory(category)}>edit</button>
      <button data-testid={`card-delete-${category.id}`} onClick={() => onDeleteCategory(category)}>delete</button>
    </div>
  ),
}));

jest.mock("../CategoriesTable", () => ({
  CategoriesTable: ({ categories, onEditCategory, onDeleteCategory }) => (
    <div data-testid="categories-table">
      {categories.map((c) => (
        <div key={c.id}>
          <span>{c.name}</span>
          <button data-testid={`table-edit-${c.id}`} onClick={() => onEditCategory(c)}>edit</button>
          <button data-testid={`table-delete-${c.id}`} onClick={() => onDeleteCategory(c)}>delete</button>
        </div>
      ))}
    </div>
  ),
}));

const categories = [
  { id: "cat-1", name: "Hardware" },
  { id: "cat-2", name: "Gadgets" },
];

const defaultProps = {
  categories,
  onEditCategory: jest.fn(),
  onDeleteCategory: jest.fn(),
};

function renderList(props = {}) {
  return render(<CategoriesList {...defaultProps} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CategoriesList", () => {
  it("renders a card for each category", () => {
    renderList();

    expect(screen.getByTestId("card-cat-1")).toBeInTheDocument();
    expect(screen.getByTestId("card-cat-2")).toBeInTheDocument();
  });

  it("renders the table", () => {
    renderList();

    expect(screen.getByTestId("categories-table")).toBeInTheDocument();
  });

  it("passes onEditCategory to cards", () => {
    const onEditCategory = jest.fn();
    renderList({ onEditCategory });

    fireEvent.click(screen.getByTestId("card-edit-cat-1"));
    expect(onEditCategory).toHaveBeenCalledWith(categories[0]);
  });

  it("passes onDeleteCategory to cards", () => {
    const onDeleteCategory = jest.fn();
    renderList({ onDeleteCategory });

    fireEvent.click(screen.getByTestId("card-delete-cat-2"));
    expect(onDeleteCategory).toHaveBeenCalledWith(categories[1]);
  });

  it("passes onEditCategory to table", () => {
    const onEditCategory = jest.fn();
    renderList({ onEditCategory });

    fireEvent.click(screen.getByTestId("table-edit-cat-1"));
    expect(onEditCategory).toHaveBeenCalledWith(categories[0]);
  });

  it("passes onDeleteCategory to table", () => {
    const onDeleteCategory = jest.fn();
    renderList({ onDeleteCategory });

    fireEvent.click(screen.getByTestId("table-delete-cat-2"));
    expect(onDeleteCategory).toHaveBeenCalledWith(categories[1]);
  });
});
