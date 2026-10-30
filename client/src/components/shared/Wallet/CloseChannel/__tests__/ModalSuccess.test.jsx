import { fireEvent, screen } from "@testing-library/react";

import { renderWithinModal } from "@test-utils/renderWithinModal";

import { ModalSuccess } from "../ModalSuccess";

const TX_ID = "abc-tx-123";

function renderModal(props = {}) {
  return renderWithinModal(<ModalSuccess txId={TX_ID} onClose={jest.fn()} {...props} />);
}

describe("ModalSuccess", () => {
  it("shows the success title", () => {
    renderModal();

    expect(screen.getByText("closeChannel.successTitle")).toBeInTheDocument();
  });

  it("shows the transaction id", () => {
    renderModal();

    expect(screen.getByText(TX_ID)).toBeInTheDocument();
  });

  it("shows a copy button for the transaction id", () => {
    renderModal();

    expect(screen.getByText("closeChannel.copyTxIdButton")).toBeInTheDocument();
  });

  it("calls onClose when the done button is clicked", () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByText("closeChannel.doneButton"));

    expect(onClose).toHaveBeenCalled();
  });
});
