import { fireEvent, screen } from "@testing-library/react";

import { renderWithinModal } from "@test-utils/renderWithinModal";

import { ModalChannelNotAvailable } from "../ModalChannelNotAvailable";

const mockChannel = {
  channelId: "abc123def456",
  state: "Syncing",
};

function renderModal(props = {}) {
  return renderWithinModal(
    <ModalChannelNotAvailable
      channel={mockChannel}
      isLoading={false}
      onRetry={jest.fn()}
      onClose={jest.fn()}
      {...props}
    />,
  );
}

describe("ModalChannelNotAvailable", () => {
  it("shows the title and description", () => {
    renderModal();

    expect(screen.getByText("closeChannel.stuckTitle")).toBeInTheDocument();
    expect(screen.getByText("closeChannel.stuckDescription")).toBeInTheDocument();
  });

  it("shows the channel id", () => {
    renderModal();

    expect(screen.getByText(mockChannel.channelId)).toBeInTheDocument();
  });

  it("links to the phoenixd GitHub issues page in a new tab", () => {
    renderModal();

    const contactLink = screen.getByText("closeChannel.stuckOptionContact");
    expect(contactLink).toHaveAttribute("href", "https://github.com/ACINQ/phoenixd/issues");
    expect(contactLink).toHaveAttribute("target", "_blank");
    expect(contactLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("calls onRetry when the retry button is clicked", () => {
    const onRetry = jest.fn();
    renderModal({ onRetry });

    fireEvent.click(screen.getByText("closeChannel.stuckRetryButton"));

    expect(onRetry).toHaveBeenCalled();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByText("closeChannel.stuckCloseButton"));

    expect(onClose).toHaveBeenCalled();
  });

  it("disables the close button while loading", () => {
    renderModal({ isLoading: true });

    expect(screen.getByRole("button", { name: "closeChannel.stuckCloseButton" })).toBeDisabled();
  });
});
