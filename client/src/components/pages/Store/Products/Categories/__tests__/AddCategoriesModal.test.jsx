import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { AddCategoriesModal } from "../AddCategoriesModal";

const baseData = {
  categoryId: "",
  categoryName: "New Cat",
};

const renderModal = (props = {}) => render(
  <I18nProvider>
    <AddCategoriesModal
      data={baseData}
      setData={jest.fn()}
      addCategory={jest.fn(() => Promise.resolve())}
      onChange={jest.fn()}
      addCategoriesShowModal
      setAddCategoriesShowModal={jest.fn()}
      {...props}
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

  it("calls addCategory with data on submit and closes modal", async () => {
    const addCategory = jest.fn(() => Promise.resolve());
    const setAddCategoriesShowModal = jest.fn();
    const setData = jest.fn();

    renderModal({ addCategory, setAddCategoriesShowModal, setData });

    fireEvent.click(screen.getByText("modal.submitButton"));

    await waitFor(() => expect(addCategory).toHaveBeenCalledWith(baseData));
    expect(setData).toHaveBeenCalledWith({ categoryName: "" });
    expect(setAddCategoriesShowModal).toHaveBeenCalledWith(false);
  });

  it("prevents double submit while submitting", () => {
    const addCategory = jest.fn(() => new Promise(() => {}));
    renderModal({ addCategory });

    fireEvent.click(screen.getByText("modal.submitButton"));
    fireEvent.click(screen.getByText("modal.submitButton"));
    expect(addCategory).toHaveBeenCalledTimes(1);
  });
});
