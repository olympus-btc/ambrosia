import { render, screen, fireEvent } from "@testing-library/react";

import { ImportBackupConfirmModal } from "../ImportBackupConfirmModal";

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

const importDataTranslations = (key) => key;

function renderModal(props = {}) {
  return render(
    <ImportBackupConfirmModal
      isOpen
      onOpenChange={jest.fn()}
      onConfirm={jest.fn()}
      importDataTranslations={importDataTranslations}
      {...props}
    />,
  );
}

describe("ImportBackupConfirmModal", () => {
  it("does not render when closed", () => {
    render(
      <ImportBackupConfirmModal
        isOpen={false}
        onOpenChange={jest.fn()}
        onConfirm={jest.fn()}
        importDataTranslations={importDataTranslations}
      />,
    );
    expect(screen.queryByText("cardImportData.confirmModal.title")).not.toBeInTheDocument();
  });

  it("renders the title, description, and warning", () => {
    renderModal();
    expect(screen.getByText("cardImportData.confirmModal.title")).toBeInTheDocument();
    expect(screen.getByText("cardImportData.confirmModal.description")).toBeInTheDocument();
    expect(screen.getByText("cardImportData.confirmModal.warning")).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is pressed", () => {
    const onConfirm = jest.fn();
    renderModal({ onConfirm });
    fireEvent.click(screen.getByText("cardImportData.confirmModal.confirmButton"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange with false when the cancel button is pressed", () => {
    const onOpenChange = jest.fn();
    renderModal({ onOpenChange });
    fireEvent.click(screen.getByText("cardImportData.confirmModal.cancelButton"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
