import { fireEvent, screen } from "@testing-library/react";

import { renderWithinModal } from "@test-utils/renderWithinModal";

import { ModalConfirm } from "../ModalConfirm";

const mockChannel = {
  channelId: "ch-1",
  balanceSat: 9163,
};

const LONG_ADDRESS = "tb1q8tsk6x7y9m2lqz3p4r5w6e7i8u9o0zsqe22cy";
const SHORT_ADDRESS = "bc1qshort";

function renderModal(props = {}) {
  return renderWithinModal(
    <ModalConfirm
      channel={mockChannel}
      address={LONG_ADDRESS}
      feerate="10"
      isLoading={false}
      onBack={jest.fn()}
      onConfirm={jest.fn()}
      {...props}
    />,
  );
}

describe("ModalConfirm", () => {
  it("shows the formatted channel balance", () => {
    renderModal();

    expect(screen.getByText("9,163 closeChannel.satUnit")).toBeInTheDocument();
  });

  it("truncates a long address", () => {
    renderModal();

    expect(screen.getByText(`${LONG_ADDRESS.slice(0, 8)}...${LONG_ADDRESS.slice(-8)}`)).toBeInTheDocument();
    expect(screen.queryByText(LONG_ADDRESS)).not.toBeInTheDocument();
  });

  it("shows a short address in full", () => {
    renderModal({ address: SHORT_ADDRESS });

    expect(screen.getByText(SHORT_ADDRESS)).toBeInTheDocument();
  });

  it("shows the feerate", () => {
    renderModal({ feerate: "12" });

    expect(screen.getByText("12 sat/byte")).toBeInTheDocument();
  });

  it("calls onBack when the back button is clicked", () => {
    const onBack = jest.fn();
    renderModal({ onBack });

    fireEvent.click(screen.getByText("closeChannel.backButton"));

    expect(onBack).toHaveBeenCalled();
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = jest.fn();
    renderModal({ onConfirm });

    fireEvent.click(screen.getByText("closeChannel.confirmButton"));

    expect(onConfirm).toHaveBeenCalled();
  });

  it("disables the back button while loading", () => {
    renderModal({ isLoading: true });

    expect(screen.getByRole("button", { name: "closeChannel.backButton" })).toBeDisabled();
  });
});
