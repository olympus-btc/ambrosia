import { render, screen, fireEvent } from "@testing-library/react";

import { OverwriteConfirmModal } from "../OverwriteConfirmModal";

jest.mock("@heroui/react", () => ({
  Modal: ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null),
  ModalContent: ({ children }) => <div>{children}</div>,
  ModalHeader: ({ children }) => <div>{children}</div>,
  ModalBody: ({ children }) => <div>{children}</div>,
  ModalFooter: ({ children }) => <div>{children}</div>,
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>{children}</button>
  ),
}));

function renderModal(props = {}) {
  return render(
    <OverwriteConfirmModal
      isOpen
      onOpenChange={jest.fn()}
      onConfirm={jest.fn()}
      title="Overwrite everything?"
      description="This replaces the current data."
      warning="This cannot be undone."
      cancelText="Cancel"
      confirmText="Overwrite"
      {...props}
    />,
  );
}

describe("OverwriteConfirmModal", () => {
  it("does not render when closed", () => {
    render(
      <OverwriteConfirmModal
        isOpen={false}
        onOpenChange={jest.fn()}
        onConfirm={jest.fn()}
        title="Overwrite everything?"
        description="This replaces the current data."
        warning="This cannot be undone."
        cancelText="Cancel"
        confirmText="Overwrite"
      />,
    );
    expect(screen.queryByText("Overwrite everything?")).not.toBeInTheDocument();
  });

  it("renders the title, description, and warning", () => {
    renderModal();
    expect(screen.getByText("Overwrite everything?")).toBeInTheDocument();
    expect(screen.getByText("This replaces the current data.")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is pressed", () => {
    const onConfirm = jest.fn();
    renderModal({ onConfirm });
    fireEvent.click(screen.getByText("Overwrite"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange with false when the cancel button is pressed", () => {
    const onOpenChange = jest.fn();
    renderModal({ onOpenChange });
    fireEvent.click(screen.getByText("Cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
