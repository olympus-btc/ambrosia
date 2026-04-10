import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@i18n/I18nProvider";

import { InstallPWA } from "../InstallPWA";

jest.mock("@hooks/usePWA", () => ({
  useIsStandalone: jest.fn(),
  useIsIOS: jest.fn(),
  useIsAndroid: jest.fn(),
  useInstallPrompt: jest.fn(),
}));

const { useIsStandalone, useIsIOS, useIsAndroid, useInstallPrompt } = require("@hooks/usePWA");

const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("aria-label")) return;
    originalWarn.call(console, ...args);
  };
  console.error = (...args) => {
    const message = typeof args[0] === "string" ? args[0] : String(args[0]);
    if (
      message.includes("onAnimationComplete") ||
      message.includes("Unknown event handler property")
    ) return;
    originalError.call(console, ...args);
  };

  useIsStandalone.mockReturnValue(false);
  useIsIOS.mockReturnValue(false);
  useIsAndroid.mockReturnValue(false);
  useInstallPrompt.mockReturnValue({ isInstallable: false, promptInstall: jest.fn() });

  jest.clearAllMocks();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

function renderComponent() {
  return render(
    <I18nProvider>
      <InstallPWA />
    </I18nProvider>,
  );
}

describe("InstallPWA", () => {
  describe("Visibility", () => {
    it("renders nothing when app is already standalone", async () => {
      useIsStandalone.mockReturnValue(true);

      let container;
      await act(async () => { ({ container } = renderComponent()); });

      expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing when not installable and not on iOS or Android", async () => {
      let container;
      await act(async () => { ({ container } = renderComponent()); });

      expect(container).toBeEmptyDOMElement();
    });

    it("renders the card title and subtitle when visible", async () => {
      useInstallPrompt.mockReturnValue({ isInstallable: true, promptInstall: jest.fn() });

      await act(async () => { renderComponent(); });

      expect(screen.getByText("cardInstall.title")).toBeInTheDocument();
      expect(screen.getByText("cardInstall.subtitle")).toBeInTheDocument();
    });
  });

  describe("Install button (Chrome / Android with beforeinstallprompt)", () => {
    it("renders install button when isInstallable is true", async () => {
      useInstallPrompt.mockReturnValue({ isInstallable: true, promptInstall: jest.fn() });

      await act(async () => { renderComponent(); });

      expect(screen.getByText("cardInstall.button")).toBeInTheDocument();
    });

    it("calls promptInstall when install button is pressed", async () => {
      const mockPromptInstall = jest.fn();
      useInstallPrompt.mockReturnValue({ isInstallable: true, promptInstall: mockPromptInstall });

      const user = userEvent.setup();
      await act(async () => { renderComponent(); });

      await user.click(screen.getByText("cardInstall.button"));
      expect(mockPromptInstall).toHaveBeenCalledTimes(1);
    });
  });

  describe("iOS manual install steps", () => {
    beforeEach(() => {
      useIsIOS.mockReturnValue(true);
    });

    it("renders iOS steps when on iOS and not installable", async () => {
      await act(async () => { renderComponent(); });

      expect(screen.getByText("cardInstall.iosStep1")).toBeInTheDocument();
      expect(screen.getByText("cardInstall.iosStep2")).toBeInTheDocument();
    });

    it("renders step numbers 1 and 2", async () => {
      await act(async () => { renderComponent(); });

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("step circles have green-800 styling", async () => {
      await act(async () => { renderComponent(); });

      const circles = screen.getAllByText(/^[12]$/);
      circles.forEach((circle) => {
        expect(circle).toHaveClass("bg-green-800");
        expect(circle).toHaveClass("text-white");
      });
    });

    it("does not render the install button", async () => {
      await act(async () => { renderComponent(); });

      expect(screen.queryByText("cardInstall.button")).not.toBeInTheDocument();
    });
  });

  describe("Android manual install steps", () => {
    beforeEach(() => {
      useIsAndroid.mockReturnValue(true);
    });

    it("renders Android steps when on Android and not installable", async () => {
      await act(async () => { renderComponent(); });

      expect(screen.getByText("cardInstall.androidStep1")).toBeInTheDocument();
      expect(screen.getByText("cardInstall.androidStep2")).toBeInTheDocument();
    });

    it("renders step numbers 1 and 2", async () => {
      await act(async () => { renderComponent(); });

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("does not render the install button", async () => {
      await act(async () => { renderComponent(); });

      expect(screen.queryByText("cardInstall.button")).not.toBeInTheDocument();
    });

    it("shows install button instead of steps when isInstallable becomes true on Android", async () => {
      useInstallPrompt.mockReturnValue({ isInstallable: true, promptInstall: jest.fn() });

      await act(async () => { renderComponent(); });

      expect(screen.getByText("cardInstall.button")).toBeInTheDocument();
      expect(screen.queryByText("cardInstall.androidStep1")).not.toBeInTheDocument();
    });
  });
});
