import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { EditCategoriesModal } from "../EditCategoriesModal";

const baseData = {
  categoryId: "cat-1",
  categoryName: "Hardware",
};

const renderModal = (props = {}) => render(
  <I18nProvider>
    <EditCategoriesModal
      data={baseData}
      setData={jest.fn()}
      onChange={jest.fn()}
      updateCategory={jest.fn(() => Promise.resolve())}
      editCategoriesShowModal
      setEditCategoriesShowModal={jest.fn()}
      {...props}
    />
  </I18nProvider>,
);

describe("EditCategoriesModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the modal with current category name", () => {
    renderModal();

    expect(screen.getByText("modal.titleEdit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hardware")).toBeInTheDocument();
    expect(screen.getByText("modal.editButton")).toBeInTheDocument();
    expect(screen.getByText("modal.cancelButton")).toBeInTheDocument();
  });

  it("calls onChange when typing in the name input", () => {
    const onChange = jest.fn();
    renderModal({ onChange });

    fireEvent.change(screen.getByLabelText("modal.categoryNameLabel"), {
      target: { value: "Hardware Updated" },
    });
    expect(onChange).toHaveBeenCalledWith({ categoryName: "Hardware Updated" });
  });

  it("resets data and closes modal when cancel is clicked", () => {
    const setData = jest.fn();
    const setEditCategoriesShowModal = jest.fn();
    renderModal({ setData, setEditCategoriesShowModal });

    fireEvent.click(screen.getByText("modal.cancelButton"));

    expect(setData).toHaveBeenCalledWith({ categoryId: "", categoryName: "" });
    expect(setEditCategoriesShowModal).toHaveBeenCalledWith(false);
  });

  it("calls updateCategory with data on submit and closes modal", async () => {
    const updateCategory = jest.fn(() => Promise.resolve());
    const setEditCategoriesShowModal = jest.fn();

    renderModal({ updateCategory, setEditCategoriesShowModal });

    fireEvent.click(screen.getByText("modal.editButton"));

    await waitFor(() => expect(updateCategory).toHaveBeenCalledWith(baseData));
    expect(setEditCategoriesShowModal).toHaveBeenCalledWith(false);
  });

  it("prevents double submit while submitting", () => {
    const updateCategory = jest.fn(() => new Promise(() => {}));
    renderModal({ updateCategory });

    fireEvent.click(screen.getByText("modal.editButton"));
    fireEvent.click(screen.getByText("modal.editButton"));
    expect(updateCategory).toHaveBeenCalledTimes(1);
  });
});
