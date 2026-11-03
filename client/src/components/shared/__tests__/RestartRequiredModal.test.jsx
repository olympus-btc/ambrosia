import { render, screen, fireEvent, act } from "@testing-library/react";

import { RestartRequiredModal } from "../RestartRequiredModal";

let mockIsElectron = false;
jest.mock("@lib/isElectron", () => ({
  get isElectron() {
    return mockIsElectron;
  },
}));

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

describe("RestartRequiredModal", () => {
  beforeEach(() => {
    mockIsElectron = false;
  });

  it("renders nothing when closed", () => {
    render(<RestartRequiredModal isOpen={false} onManualClose={jest.fn()} />);
    expect(screen.queryByText("title")).not.toBeInTheDocument();
  });

  it("renders the title, description, and acknowledge button when open outside Electron", () => {
    render(<RestartRequiredModal isOpen onManualClose={jest.fn()} />);
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("description")).toBeInTheDocument();
    expect(screen.getByText("acknowledgeButton")).toBeInTheDocument();
  });

  it("calls onManualClose when the acknowledge button is pressed outside Electron", () => {
    const onManualClose = jest.fn();
    render(<RestartRequiredModal isOpen onManualClose={onManualClose} />);
    fireEvent.click(screen.getByText("acknowledgeButton"));
    expect(onManualClose).toHaveBeenCalledTimes(1);
  });

  it("does not render a countdown outside Electron even when onRestart is provided", () => {
    render(<RestartRequiredModal isOpen onManualClose={jest.fn()} onRestart={jest.fn()} />);
    expect(screen.queryByText("countdownDescription")).not.toBeInTheDocument();
    expect(screen.queryByText("restartNowButton")).not.toBeInTheDocument();
  });

  describe("inside Electron", () => {
    beforeEach(() => {
      mockIsElectron = true;
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("renders the countdown description, seconds remaining, and restart-now button", () => {
      render(<RestartRequiredModal isOpen onRestart={jest.fn()} />);
      expect(screen.getByText("countdownDescription")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("restartNowButton")).toBeInTheDocument();
    });

    it("counts down every second", () => {
      render(<RestartRequiredModal isOpen onRestart={jest.fn()} />);
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("calls onRestart automatically once the countdown reaches zero", () => {
      const onRestart = jest.fn();
      render(<RestartRequiredModal isOpen onRestart={onRestart} />);
      for (let tick = 0; tick < 5; tick += 1) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }
      expect(onRestart).toHaveBeenCalledTimes(1);
    });

    it("calls onRestart when the restart-now button is pressed before the countdown finishes", () => {
      const onRestart = jest.fn();
      render(<RestartRequiredModal isOpen onRestart={onRestart} />);
      fireEvent.click(screen.getByText("restartNowButton"));
      expect(onRestart).toHaveBeenCalledTimes(1);
    });
  });
});
