import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { DeleteCategoriesModal } from "../DeleteCategoriesModal";

const category = { id: "cat-1", name: "Hardware" };

const renderModal = (props = {}) => render(
  <I18nProvider>
    <DeleteCategoriesModal
      category={category}
      deleteCategoriesShowModal
      setDeleteCategoriesShowModal={jest.fn()}
      onConfirm={jest.fn()}
      {...props}
    />
  </I18nProvider>,
);

describe("DeleteCategoriesModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the modal with category name", () => {
    renderModal();

    expect(screen.getByText("modal.titleDelete")).toBeInTheDocument();
    expect(screen.getByText("Hardware", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("modal.deleteButton")).toBeInTheDocument();
    expect(screen.getByText("modal.cancelButton")).toBeInTheDocument();
  });

  it("calls setDeleteCategoriesShowModal(false) when cancel is clicked", () => {
    const setDeleteCategoriesShowModal = jest.fn();
    renderModal({ setDeleteCategoriesShowModal });

    fireEvent.click(screen.getByText("modal.cancelButton"));
    expect(setDeleteCategoriesShowModal).toHaveBeenCalledWith(false);
  });

  it("calls onConfirm when delete button is clicked", () => {
    const onConfirm = jest.fn();
    renderModal({ onConfirm });

    fireEvent.click(screen.getByText("modal.deleteButton"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("does not render when deleteCategoriesShowModal is false", () => {
    renderModal({ deleteCategoriesShowModal: false });
    expect(screen.queryByText("modal.titleDelete")).not.toBeInTheDocument();
  });
});
