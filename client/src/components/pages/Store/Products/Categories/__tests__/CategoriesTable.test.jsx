import { render, screen, fireEvent } from "@testing-library/react";

import { CategoriesTable } from "../CategoriesTable";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@heroui/react", () => ({
  Table: ({ children }) => <table>{children}</table>,
  TableHeader: ({ children }) => <thead><tr>{children}</tr></thead>,
  TableColumn: ({ children, className }) => <th className={className}>{children}</th>,
  TableBody: ({ children }) => <tbody>{children}</tbody>,
  TableRow: ({ children }) => <tr>{children}</tr>,
  TableCell: ({ children, className }) => <td className={className}>{children}</td>,
}));

jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children }) => children,
}));

jest.mock("@/components/shared/EditButton", () => ({
  EditButton: ({ onPress, children }) => <button onClick={onPress}>{children}</button>,
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress, children }) => <button onClick={onPress}>{children}</button>,
}));

const categories = [
  { id: "cat-1", name: "Hardware" },
  { id: "cat-2", name: "Gadgets" },
];

const defaultProps = {
  categories,
  canManageCategories: true,
  onEditCategory: jest.fn(),
  onDeleteCategory: jest.fn(),
};

function renderTable(props = {}) {
  return render(<CategoriesTable {...defaultProps} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CategoriesTable", () => {
  it("renders column headers", () => {
    renderTable();

    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("actions")).toBeInTheDocument();
  });

  it("renders all category names", () => {
    renderTable();

    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Gadgets")).toBeInTheDocument();
  });

  it("calls onEditCategory when edit is clicked", () => {
    const onEditCategory = jest.fn();
    renderTable({ onEditCategory });

    fireEvent.click(screen.getAllByText("edit")[0].closest("button"));
    expect(onEditCategory).toHaveBeenCalledWith(categories[0]);
  });

  it("calls onDeleteCategory when delete is clicked", () => {
    const onDeleteCategory = jest.fn();
    renderTable({ onDeleteCategory });

    fireEvent.click(screen.getAllByText("delete")[1].closest("button"));
    expect(onDeleteCategory).toHaveBeenCalledWith(categories[1]);
  });

  it("hides actions column when canManageCategories is false", () => {
    renderTable({ canManageCategories: false });

    const actionsHeader = screen.getByText("actions");
    expect(actionsHeader.closest("th")).toHaveClass("hidden");
  });
});
