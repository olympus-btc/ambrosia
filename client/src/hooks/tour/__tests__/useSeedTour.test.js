import { renderHook } from "@testing-library/react";

import { useSeedTour } from "../useSeedTour";

const mockDrive = jest.fn();
const mockDestroy = jest.fn();
let capturedConfig = {};

jest.mock("driver.js", () => ({
  driver: jest.fn((config) => {
    capturedConfig = config;
    return { drive: mockDrive, destroy: mockDestroy };
  }),
}));

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/store"),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => {
    const fn = (key) => key;
    fn.raw = (key) => key;
    return fn;
  },
}));

const SEED_TOUR_KEY = "ambrosia:tour:seed";
const SEED_SETTINGS_TOUR_KEY = "ambrosia:tour:seed-settings";

function setDesktop() {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 });
}

function setMobile() {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });
}

let setItemSpy;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  localStorage.clear();
  capturedConfig = {};
  setDesktop();
  setItemSpy = jest.spyOn(Storage.prototype, "setItem");
  const { usePathname } = require("next/navigation");
  usePathname.mockReturnValue("/store");
});

afterEach(() => {
  jest.useRealTimers();
  setItemSpy.mockRestore();
});

describe("useSeedTour", () => {
  describe("tour initialization", () => {
    it("does not start tour when not authenticated", () => {
      renderHook(() => useSeedTour(false));
      jest.runAllTimers();
      expect(mockDrive).not.toHaveBeenCalled();
    });

    it("does not start tour when SEED_TOUR_KEY is already set", () => {
      localStorage.setItem(SEED_TOUR_KEY, "true");
      renderHook(() => useSeedTour(true));
      jest.runAllTimers();
      expect(mockDrive).not.toHaveBeenCalled();
    });

    it("does not start tour when not on /store", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/settings");
      renderHook(() => useSeedTour(true));
      jest.runAllTimers();
      expect(mockDrive).not.toHaveBeenCalled();
    });

    it("starts tour when authenticated, on /store, and SEED_TOUR_KEY is absent", () => {
      renderHook(() => useSeedTour(true));
      jest.runAllTimers();
      expect(mockDrive).toHaveBeenCalledTimes(1);
    });

    it("does not call drive() before timer fires", () => {
      renderHook(() => useSeedTour(true));
      expect(mockDrive).not.toHaveBeenCalled();
    });

    it("sets SEED_TOUR_KEY to 'true' in localStorage when timer fires", () => {
      renderHook(() => useSeedTour(true));
      jest.runAllTimers();
      expect(localStorage.getItem(SEED_TOUR_KEY)).toBe("true");
    });
  });

  describe("pathname effect — timer reset", () => {
    it("resets the pending timer when returning to /store without key", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/settings");
      const { rerender } = renderHook(() => useSeedTour(true));

      usePathname.mockReturnValue("/store");
      rerender();

      jest.runAllTimers();
      expect(mockDrive).toHaveBeenCalledTimes(1);
    });

    it("does not reset timer when returning to /store if SEED_TOUR_KEY is already set", () => {
      localStorage.setItem(SEED_TOUR_KEY, "true");
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/settings");
      const { rerender } = renderHook(() => useSeedTour(true));

      usePathname.mockReturnValue("/store");
      rerender();

      jest.runAllTimers();
      expect(mockDrive).not.toHaveBeenCalled();
    });
  });

  describe("pathname effect — driver cleanup", () => {
    it("destroys the driver when navigating away from /store", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store");
      const { rerender } = renderHook(() => useSeedTour(true));

      usePathname.mockReturnValue("/store/settings");
      rerender();

      expect(mockDestroy).toHaveBeenCalled();
    });

    it("does not destroy driver when staying on /store", () => {
      renderHook(() => useSeedTour(true));
      jest.runAllTimers();
      expect(mockDestroy).not.toHaveBeenCalled();
    });
  });

  describe("desktop tour (>= 768px)", () => {
    it("creates 2 steps on desktop", () => {
      renderHook(() => useSeedTour(true));
      expect(capturedConfig.steps).toHaveLength(2);
    });

    it("first step has next button", () => {
      renderHook(() => useSeedTour(true));
      expect(capturedConfig.steps[0].popover.showButtons).toEqual(["next"]);
    });

    it("second step targets #nav-settings", () => {
      renderHook(() => useSeedTour(true));
      expect(capturedConfig.steps[1].element).toBe("#nav-settings");
    });

    it("sets SEED_SETTINGS_TOUR_KEY onHighlighted", () => {
      renderHook(() => useSeedTour(true));
      capturedConfig.steps[1].onHighlighted();
      expect(setItemSpy).toHaveBeenCalledWith(SEED_SETTINGS_TOUR_KEY, "true");
    });

    it("does not have onDestroyStarted on desktop", () => {
      renderHook(() => useSeedTour(true));
      expect(capturedConfig.onDestroyStarted).toBeUndefined();
    });
  });

  describe("mobile tour (< 768px)", () => {
    beforeEach(() => setMobile());

    it("creates 1 step on mobile", () => {
      renderHook(() => useSeedTour(true));
      expect(capturedConfig.steps).toHaveLength(1);
    });

    it("single step has close button", () => {
      renderHook(() => useSeedTour(true));
      expect(capturedConfig.steps[0].popover.showButtons).toEqual(["close"]);
    });

    it("mobile step description includes a link to /store/settings", () => {
      renderHook(() => useSeedTour(true));
      expect(capturedConfig.steps[0].popover.description).toContain("/store/settings");
    });

    it("mobile step description includes the button label", () => {
      renderHook(() => useSeedTour(true));
      expect(capturedConfig.steps[0].popover.description).toContain("mobileGoToSettings");
    });

    it("does not target any element on mobile", () => {
      renderHook(() => useSeedTour(true));
      expect(capturedConfig.steps[0].element).toBeUndefined();
    });

    it("has onDestroyStarted on mobile to set SEED_SETTINGS_TOUR_KEY", () => {
      renderHook(() => useSeedTour(true));
      expect(capturedConfig.onDestroyStarted).toBeDefined();
      capturedConfig.onDestroyStarted();
      expect(setItemSpy).toHaveBeenCalledWith(SEED_SETTINGS_TOUR_KEY, "true");
    });
  });
});
