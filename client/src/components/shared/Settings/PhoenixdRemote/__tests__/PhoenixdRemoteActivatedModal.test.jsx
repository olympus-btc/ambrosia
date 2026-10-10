import { render, screen, fireEvent } from "@testing-library/react";

import { PhoenixdRemoteActivatedModal } from "../PhoenixdRemoteActivatedModal";

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

const translate = (key) => key;

describe("PhoenixdRemoteActivatedModal", () => {
  it("renders nothing when closed", () => {
    render(
      <PhoenixdRemoteActivatedModal isOpen={false} onAcknowledge={jest.fn()} phoenixdRemoteCardTranslations={translate} />,
    );
    expect(screen.queryByText("phoenixdRemoteCard.remoteActivatedTitle")).not.toBeInTheDocument();
  });

  it("renders the title, description, and acknowledge button when open", () => {
    render(
      <PhoenixdRemoteActivatedModal isOpen onAcknowledge={jest.fn()} phoenixdRemoteCardTranslations={translate} />,
    );
    expect(screen.getByText("phoenixdRemoteCard.remoteActivatedTitle")).toBeInTheDocument();
    expect(screen.getByText("phoenixdRemoteCard.remoteActivatedDescription")).toBeInTheDocument();
    expect(screen.getByText("phoenixdRemoteCard.remoteActivatedButton")).toBeInTheDocument();
  });

  it("calls onAcknowledge when the acknowledge button is pressed", () => {
    const onAcknowledge = jest.fn();
    render(
      <PhoenixdRemoteActivatedModal isOpen onAcknowledge={onAcknowledge} phoenixdRemoteCardTranslations={translate} />,
    );
    fireEvent.click(screen.getByText("phoenixdRemoteCard.remoteActivatedButton"));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });
});
