import { Modal, ModalContent } from "@heroui/react";
import { fireEvent, render, screen } from "@testing-library/react";

import { TimeEntryModalFooter } from "../TimeEntryModalFooter";

function renderTimeEntryModalFooter(footerPropOverrides = {}) {
  const footerCallbacks = {
    onStartEditing: jest.fn(),
    onDelete: jest.fn(),
    onCancel: jest.fn(),
    onClose: jest.fn(),
  };
  render(
    <Modal isOpen>
      <ModalContent>
        <TimeEntryModalFooter
          isReadOnly={false}
          isEditing
          canEdit
          canDelete
          isFormComplete
          isSubmitting={false}
          {...footerCallbacks}
          {...footerPropOverrides}
        />
      </ModalContent>
    </Modal>,
  );
  return footerCallbacks;
}

describe("TimeEntryModalFooter", () => {
  describe("read only mode", () => {
    it("shows close and edit", () => {
      const { onClose, onStartEditing } = renderTimeEntryModalFooter({ isReadOnly: true });

      fireEvent.click(screen.getByRole("button", { name: "modal.closeButton" }));
      fireEvent.click(screen.getByRole("button", { name: "modal.editButton" }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onStartEditing).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("button", { name: "modal.saveButton" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "delete" })).not.toBeInTheDocument();
    });

    it("hides edit when the entry cannot be edited", () => {
      renderTimeEntryModalFooter({ isReadOnly: true, canEdit: false });

      expect(screen.queryByRole("button", { name: "modal.editButton" })).not.toBeInTheDocument();
    });
  });

  describe("edit mode", () => {
    it("shows delete, cancel and save", () => {
      const { onDelete, onCancel } = renderTimeEntryModalFooter();

      fireEvent.click(screen.getByRole("button", { name: "delete" }));
      fireEvent.click(screen.getByRole("button", { name: "modal.cancelButton" }));

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: "modal.saveButton" })).toHaveAttribute("type", "submit");
    });

    it("hides delete when adding an entry", () => {
      renderTimeEntryModalFooter({ isEditing: false });

      expect(screen.queryByRole("button", { name: "delete" })).not.toBeInTheDocument();
    });

    it("hides delete without the delete permission", () => {
      renderTimeEntryModalFooter({ canDelete: false });

      expect(screen.queryByRole("button", { name: "delete" })).not.toBeInTheDocument();
    });

    it("disables save until the form is complete", () => {
      renderTimeEntryModalFooter({ isFormComplete: false });

      expect(screen.getByRole("button", { name: "modal.saveButton" })).toBeDisabled();
    });
  });
});
