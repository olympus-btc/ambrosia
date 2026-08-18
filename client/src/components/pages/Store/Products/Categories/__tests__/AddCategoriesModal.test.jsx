import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { AddCategoriesModal } from "../AddCategoriesModal";

const baseCategoryForm = {
  categoryId: "",
  categoryName: "New Cat",
};

const renderModal = (modalProps = {}) => render(
  <I18nProvider>
    <AddCategoriesModal
      categoryForm={baseCategoryForm}
      setCategoryForm={jest.fn()}
      addCategory={jest.fn(() => Promise.resolve())}
      onChange={jest.fn()}
      addCategoriesShowModal
      setAddCategoriesShowModal={jest.fn()}
      {...modalProps}
    />
  </I18nProvider>,
);

describe("AddCategoriesModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the modal with name input and buttons", () => {
    renderModal();

    expect(screen.getByText("modal.titleAdd")).toBeInTheDocument();
    expect(screen.getByLabelText("modal.categoryNameLabel")).toBeInTheDocument();
    expect(screen.getByText("modal.submitButton")).toBeInTheDocument();
    expect(screen.getByText("modal.cancelButton")).toBeInTheDocument();
  });

  it("calls onChange when typing in the name input", () => {
    const onChange = jest.fn();
    renderModal({ onChange });

    fireEvent.change(screen.getByLabelText("modal.categoryNameLabel"), {
      target: { value: "Electronics" },
    });
    expect(onChange).toHaveBeenCalledWith({ categoryName: "Electronics" });
  });

  it("calls setAddCategoriesShowModal(false) when cancel is clicked", () => {
    const setAddCategoriesShowModal = jest.fn();
    renderModal({ setAddCategoriesShowModal });

    fireEvent.click(screen.getByText("modal.cancelButton"));
    expect(setAddCategoriesShowModal).toHaveBeenCalledWith(false);
  });

  it("calls addCategory with category form on submit and closes modal", async () => {
    const addCategory = jest.fn(() => Promise.resolve());
    const setAddCategoriesShowModal = jest.fn();
    const setCategoryForm = jest.fn();

    renderModal({ addCategory, setAddCategoriesShowModal, setCategoryForm });

    fireEvent.click(screen.getByText("modal.submitButton"));

    await waitFor(() => expect(addCategory).toHaveBeenCalledWith(baseCategoryForm));
    expect(setCategoryForm).toHaveBeenCalledWith({ categoryName: "" });
    expect(setAddCategoriesShowModal).toHaveBeenCalledWith(false);
  });

  it("does not reset or close when addCategory fails", async () => {
    const addCategory = jest.fn(() => Promise.reject(new Error("add failed")));
    const setAddCategoriesShowModal = jest.fn();
    const setCategoryForm = jest.fn();

    renderModal({ addCategory, setAddCategoriesShowModal, setCategoryForm });

    fireEvent.click(screen.getByText("modal.submitButton"));

    await waitFor(() => expect(addCategory).toHaveBeenCalledWith(baseCategoryForm));
    expect(setCategoryForm).not.toHaveBeenCalled();
    expect(setAddCategoriesShowModal).not.toHaveBeenCalledWith(false);
  });

  it("prevents double submit while submitting", () => {
    const addCategory = jest.fn(() => new Promise(() => {}));
    renderModal({ addCategory });

    fireEvent.click(screen.getByText("modal.submitButton"));
    fireEvent.click(screen.getByText("modal.submitButton"));
    expect(addCategory).toHaveBeenCalledTimes(1);
  });
});
