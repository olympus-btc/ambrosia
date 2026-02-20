import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UpdateBanner from "../UpdateBanner";

const mockIsElectron = jest.fn(() => true);
const mockIsWindows = jest.fn(() => false);
const mockInstallUpdate = jest.fn();
const mockOpenReleasePage = jest.fn();
const mockOnUpdateEvent = jest.fn(() => jest.fn());

jest.mock("@/utils/electron", () => ({
  isElectron: (...args) => mockIsElectron(...args),
  isWindows: (...args) => mockIsWindows(...args),
  installUpdate: (...args) => mockInstallUpdate(...args),
  openReleasePage: (...args) => mockOpenReleasePage(...args),
  onUpdateEvent: (...args) => mockOnUpdateEvent(...args),
}));

let eventCallbacks;

function setupEventCapture() {
  eventCallbacks = {};
  mockOnUpdateEvent.mockImplementation((event, callback) => {
    eventCallbacks[event] = callback;
    return jest.fn();
  });
}

function simulateUpdateAvailable(data = { version: "1.0.0" }) {
  act(() => {
    eventCallbacks["update:available"]?.(data);
  });
}

function simulateUpdateDownloaded(data = { version: "1.0.0" }) {
  act(() => {
    eventCallbacks["update:downloaded"]?.(data);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsElectron.mockReturnValue(true);
  mockIsWindows.mockReturnValue(false);
  setupEventCapture();
  delete window.open;
  window.open = jest.fn();
});

describe("UpdateBanner", () => {
  describe("Initial state", () => {
    it("renders nothing when no update is available", () => {
      const { container } = render(<UpdateBanner />);
      expect(container.firstChild).toBeNull();
    });

    it("does not subscribe to events when not in Electron", () => {
      mockIsElectron.mockReturnValue(false);
      render(<UpdateBanner />);
      expect(mockOnUpdateEvent).not.toHaveBeenCalled();
    });

    it("subscribes to update:available and update:downloaded in Electron", () => {
      render(<UpdateBanner />);
      expect(mockOnUpdateEvent).toHaveBeenCalledWith("update:available", expect.any(Function));
      expect(mockOnUpdateEvent).toHaveBeenCalledWith("update:downloaded", expect.any(Function));
    });
  });

  describe("Update available", () => {
    it("shows banner when update:available event fires", () => {
      render(<UpdateBanner />);
      simulateUpdateAvailable({ version: "2.0.0" });

      expect(screen.getByText("newVersionAvailable")).toBeInTheDocument();
    });

    it("shows download button for non-Windows platforms", () => {
      mockIsWindows.mockReturnValue(false);
      render(<UpdateBanner />);
      simulateUpdateAvailable();

      expect(screen.getByText("downloadFromGitHub")).toBeInTheDocument();
    });

    it("calls openReleasePage in Electron when download button is pressed", async () => {
      const user = userEvent.setup();
      render(<UpdateBanner />);
      simulateUpdateAvailable();

      await user.click(screen.getByText("downloadFromGitHub"));
      expect(mockOpenReleasePage).toHaveBeenCalled();
    });

    it("opens GitHub releases in browser when not in Electron", async () => {
      const user = userEvent.setup();
      render(<UpdateBanner />);
      simulateUpdateAvailable();

      mockIsElectron.mockReturnValue(false);

      await user.click(screen.getByText("downloadFromGitHub"));
      expect(window.open).toHaveBeenCalledWith(
        "https://github.com/olympus-btc/ambrosia/releases",
        "_blank",
      );
      expect(mockOpenReleasePage).not.toHaveBeenCalled();
    });
  });

  describe("Update downloaded", () => {
    it("shows ready to install message", () => {
      render(<UpdateBanner />);
      simulateUpdateDownloaded({ version: "2.0.0" });

      expect(screen.getByText("readyToInstall")).toBeInTheDocument();
    });

    it("shows restart button when downloaded", () => {
      render(<UpdateBanner />);
      simulateUpdateDownloaded();

      expect(screen.getByText("restartAndUpdate")).toBeInTheDocument();
    });

    it("calls installUpdate on Windows when downloaded", async () => {
      mockIsWindows.mockReturnValue(true);
      const user = userEvent.setup();
      render(<UpdateBanner />);
      simulateUpdateDownloaded();

      await user.click(screen.getByText("restartAndUpdate"));
      expect(mockInstallUpdate).toHaveBeenCalled();
    });

    it("calls openReleasePage on macOS/Linux even when downloaded", async () => {
      mockIsWindows.mockReturnValue(false);
      const user = userEvent.setup();
      render(<UpdateBanner />);
      simulateUpdateDownloaded();

      await user.click(screen.getByText("restartAndUpdate"));
      expect(mockOpenReleasePage).toHaveBeenCalled();
    });
  });

  describe("Dismiss", () => {
    it("hides banner when dismiss button is pressed", async () => {
      const user = userEvent.setup();
      render(<UpdateBanner />);
      simulateUpdateAvailable();

      expect(screen.getByText("newVersionAvailable")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "dismiss" }));
      expect(screen.queryByText("newVersionAvailable")).not.toBeInTheDocument();
    });
  });

  describe("Cleanup", () => {
    it("calls cleanup functions on unmount", () => {
      const cleanup1 = jest.fn();
      const cleanup2 = jest.fn();
      let callCount = 0;
      mockOnUpdateEvent.mockImplementation((event, callback) => {
        eventCallbacks[event] = callback;
        callCount++;
        return callCount === 1 ? cleanup1 : cleanup2;
      });

      const { unmount } = render(<UpdateBanner />);
      unmount();

      expect(cleanup1).toHaveBeenCalled();
      expect(cleanup2).toHaveBeenCalled();
    });
  });
});
