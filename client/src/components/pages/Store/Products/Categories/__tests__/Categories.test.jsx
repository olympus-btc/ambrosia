import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { Categories } from "../Categories";

jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children }) => <>{children}</>,
  usePermission: () => true,
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

const renderCategories = (props = {}) => render(
  <I18nProvider>
    <Categories
      categories={categories}
      createCategory={jest.fn(() => Promise.resolve("cat-3"))}
      updateCategory={jest.fn(() => Promise.resolve())}
      deleteCategory={jest.fn(() => Promise.resolve())}
      refetch={jest.fn(() => Promise.resolve())}
      {...props}
    />
  </I18nProvider>,
);

describe("Categories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the categories table with existing categories", () => {
    renderCategories();

    expect(screen.getAllByText("Hardware").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gadgets").length).toBeGreaterThan(0);
  });

  it("opens AddCategoriesModal when clicking add category button", async () => {
    renderCategories();

    await act(async () => {
      fireEvent.click(screen.getByText("addCategory"));
    });

    expect(screen.getByText("modal.titleAdd")).toBeInTheDocument();
  });

  it("opens EditCategoriesModal with correct data when clicking edit", async () => {
    renderCategories();

    await act(async () => {
      fireEvent.click(screen.getAllByText("edit")[0].closest("button"));
    });

    expect(screen.getByText("modal.titleEdit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hardware")).toBeInTheDocument();
  });

  it("opens DeleteCategoriesModal when clicking delete", async () => {
    renderCategories();

    await act(async () => {
      fireEvent.click(screen.getAllByText("delete")[0].closest("button"));
    });

    expect(screen.getByText("modal.titleDelete")).toBeInTheDocument();
  });

  it("calls createCategory and refetch when adding a new category", async () => {
    const createCategory = jest.fn(() => Promise.resolve("cat-3"));
    const refetch = jest.fn(() => Promise.resolve());
    renderCategories({ createCategory, refetch });

    await act(async () => {
      fireEvent.click(screen.getByText("addCategory"));
    });

    fireEvent.change(screen.getByLabelText("modal.categoryNameLabel"), {
      target: { value: "New Category" },
    });

    await act(async () => {
      fireEvent.click(screen.getByText("modal.submitButton"));
    });

    await waitFor(() => expect(createCategory).toHaveBeenCalledWith("New Category", "product"));
    expect(refetch).toHaveBeenCalled();
  });

  it("calls updateCategory when saving an edited category", async () => {
    const updateCategory = jest.fn(() => Promise.resolve());
    renderCategories({ updateCategory });

    await act(async () => {
      fireEvent.click(screen.getAllByText("edit")[0].closest("button"));
    });

    const input = screen.getByLabelText("modal.categoryNameLabel");
    fireEvent.change(input, { target: { value: "Hardware Updated" } });

    await act(async () => {
      fireEvent.click(screen.getByText("modal.editButton"));
    });

    await waitFor(() => expect(updateCategory).toHaveBeenCalledWith(
      expect.objectContaining({ categoryName: "Hardware Updated" }),
    ));
  });

  it("calls deleteCategory and closes modal when confirming deletion", async () => {
    const deleteCategory = jest.fn(() => Promise.resolve());
    renderCategories({ deleteCategory });

    await act(async () => {
      fireEvent.click(screen.getAllByText("delete")[0].closest("button"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("modal.deleteButton"));
    });

    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith("cat-1"));
    expect(screen.queryByText("modal.titleDelete")).not.toBeInTheDocument();
  });
});
