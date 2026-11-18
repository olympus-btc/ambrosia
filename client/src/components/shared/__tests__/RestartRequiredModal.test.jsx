import { render, screen, fireEvent, act } from "@testing-library/react";

import { RestartRequiredModal } from "../RestartRequiredModal";

const PHOENIXD_STEPS = [
  ["step-one-before ", " step-one-after"],
  ["step-two-before ", " step-two-after"],
];
const PHOENIXD_HIGHLIGHTS = ["highlight-one", "highlight-two"];
jest.mock("next-intl", () => {
  const restartModalTranslations = (translationKey) => translationKey;
  restartModalTranslations.raw = (translationKey) => {
    if (translationKey === "phoenixdSteps") return PHOENIXD_STEPS;
    if (translationKey === "phoenixdHighlights") return PHOENIXD_HIGHLIGHTS;
    return translationKey;
  };
  return { useTranslations: () => restartModalTranslations };
});

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
  Button: ({ onPress, isDisabled, children, ...props }) => (
    <button type="button" onClick={onPress} disabled={isDisabled} {...props}>{children}</button>
  ),
  Spinner: () => <div data-testid="spinner" />,
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

  it("renders the phoenixd restart steps with the highlighted terms outside Electron when includesPhoenixdData is true", () => {
    render(<RestartRequiredModal isOpen onManualClose={jest.fn()} includesPhoenixdData />);
    const renderedSteps = screen.getAllByRole("listitem");
    expect(renderedSteps[0]).toHaveTextContent("step-one-before highlight-one step-one-after");
    expect(renderedSteps[1]).toHaveTextContent("step-two-before highlight-two step-two-after");
    expect(screen.queryByText("description")).not.toBeInTheDocument();
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

    it("calls onRestart automatically once the countdown reaches zero", async () => {
      const onRestart = jest.fn().mockResolvedValue();
      render(<RestartRequiredModal isOpen onRestart={onRestart} />);
      for (let tick = 0; tick < 5; tick += 1) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }
      expect(onRestart).toHaveBeenCalledTimes(1);
      await act(async () => {
        await Promise.resolve();
      });
    });

    it("calls onRestart when the restart-now button is pressed before the countdown finishes", async () => {
      const onRestart = jest.fn().mockResolvedValue();
      render(<RestartRequiredModal isOpen onRestart={onRestart} />);
      fireEvent.click(screen.getByText("restartNowButton"));
      expect(onRestart).toHaveBeenCalledTimes(1);
      await act(async () => {
        await Promise.resolve();
      });
    });

    it("shows a disabled restarting indicator while onRestart is in flight", async () => {
      let resolveRestart;
      const onRestart = jest.fn(() => new Promise((resolve) => { resolveRestart = resolve; }));
      render(<RestartRequiredModal isOpen onRestart={onRestart} />);

      for (let tick = 0; tick < 5; tick += 1) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }

      expect(screen.getByText("restartingButton")).toBeDisabled();
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.queryByText("5")).not.toBeInTheDocument();

      await act(async () => {
        resolveRestart();
        await Promise.resolve();
      });
    });

    it("shows an enabled reload button once onRestart resolves", async () => {
      const onRestart = jest.fn().mockResolvedValue();
      render(<RestartRequiredModal isOpen onRestart={onRestart} />);

      for (let tick = 0; tick < 5; tick += 1) {
        await act(async () => {
          jest.advanceTimersByTime(1000);
        });
      }
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText("readyDescription")).toBeInTheDocument();
      expect(screen.getByText("reloadButton")).not.toBeDisabled();
    });
  });
});
