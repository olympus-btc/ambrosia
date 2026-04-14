import { render, screen, fireEvent } from "@testing-library/react";

import { CategoriesCard } from "../CategoriesCard";

jest.mock("@heroui/react", () => ({
  Card: ({ children, shadow, className }) => <div data-shadow={shadow} className={className}>{children}</div>,
  CardBody: ({ children, className }) => <div className={className}>{children}</div>,
}));

jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children }) => children,
}));

jest.mock("@/components/shared/EditButton", () => ({
  EditButton: ({ onPress }) => <button data-testid="edit-button" onClick={onPress} />,
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress }) => <button data-testid="delete-button" onClick={onPress} />,
}));

const category = { id: "cat-1", name: "Hardware" };

const defaultProps = {
  category,
  canManageCategories: true,
  onEditCategory: jest.fn(),
  onDeleteCategory: jest.fn(),
};

function renderCard(props = {}) {
  return render(<CategoriesCard {...defaultProps} {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CategoriesCard", () => {
  it("renders the category name", () => {
    renderCard();

    expect(screen.getByText("Hardware")).toBeInTheDocument();
  });

  it("renders edit and delete buttons when canManageCategories is true", () => {
    renderCard();

    expect(screen.getByTestId("edit-button")).toBeInTheDocument();
    expect(screen.getByTestId("delete-button")).toBeInTheDocument();
  });

  it("hides action buttons when canManageCategories is false", () => {
    renderCard({ canManageCategories: false });

    expect(screen.queryByTestId("edit-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("delete-button")).not.toBeInTheDocument();
  });

  it("calls onEditCategory with the category when edit is pressed", () => {
    const onEditCategory = jest.fn();
    renderCard({ onEditCategory });

    fireEvent.click(screen.getByTestId("edit-button"));
    expect(onEditCategory).toHaveBeenCalledWith(category);
  });

  it("calls onDeleteCategory with the category when delete is pressed", () => {
    const onDeleteCategory = jest.fn();
    renderCard({ onDeleteCategory });

    fireEvent.click(screen.getByTestId("delete-button"));
    expect(onDeleteCategory).toHaveBeenCalledWith(category);
  });
});
