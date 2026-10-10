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

const STORE_SEED_TOUR_ROUTES = { homeRoute: "/store", settingsRoute: "/store/settings" };

function renderSeedTour(seedTourOptions = {}) {
  return renderHook(() => useSeedTour({ isAuth: true, ...STORE_SEED_TOUR_ROUTES, ...seedTourOptions }));
}

describe("useSeedTour", () => {
  describe("tour initialization", () => {
    it("does not start tour when not authenticated", () => {
      renderSeedTour({ isAuth: false });
      jest.runAllTimers();
      expect(mockDrive).not.toHaveBeenCalled();
    });

    it("does not start tour when SEED_TOUR_KEY is already set", () => {
      localStorage.setItem(SEED_TOUR_KEY, "true");
      renderSeedTour();
      jest.runAllTimers();
      expect(mockDrive).not.toHaveBeenCalled();
    });

    it("does not start tour when not on /store", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/settings");
      renderSeedTour();
      jest.runAllTimers();
      expect(mockDrive).not.toHaveBeenCalled();
    });

    it("starts tour when authenticated, on /store, and SEED_TOUR_KEY is absent", () => {
      renderSeedTour();
      jest.runAllTimers();
      expect(mockDrive).toHaveBeenCalledTimes(1);
    });

    it("starts tour on the given home route", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/freelancer/timesheet");
      renderSeedTour({ homeRoute: "/freelancer/timesheet", settingsRoute: "/freelancer/settings" });
      jest.runAllTimers();
      expect(mockDrive).toHaveBeenCalledTimes(1);
    });

    it("does not call drive() before timer fires", () => {
      renderSeedTour();
      expect(mockDrive).not.toHaveBeenCalled();
    });

    it("sets SEED_TOUR_KEY to 'true' in localStorage when timer fires", () => {
      renderSeedTour();
      jest.runAllTimers();
      expect(localStorage.getItem(SEED_TOUR_KEY)).toBe("true");
    });
  });

  describe("pathname effect — timer reset", () => {
    it("resets the pending timer when returning to /store without key", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/settings");
      const { rerender } = renderSeedTour();

      usePathname.mockReturnValue("/store");
      rerender();

      jest.runAllTimers();
      expect(mockDrive).toHaveBeenCalledTimes(1);
    });

    it("does not reset timer when returning to /store if SEED_TOUR_KEY is already set", () => {
      localStorage.setItem(SEED_TOUR_KEY, "true");
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/settings");
      const { rerender } = renderSeedTour();

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
      const { rerender } = renderSeedTour();

      usePathname.mockReturnValue("/store/settings");
      rerender();

      expect(mockDestroy).toHaveBeenCalled();
    });

    it("does not destroy driver when staying on /store", () => {
      renderSeedTour();
      jest.runAllTimers();
      expect(mockDestroy).not.toHaveBeenCalled();
    });
  });

  describe("desktop tour (>= 768px)", () => {
    it("creates 2 steps on desktop", () => {
      renderSeedTour();
      expect(capturedConfig.steps).toHaveLength(2);
    });

    it("first step has next button", () => {
      renderSeedTour();
      expect(capturedConfig.steps[0].popover.showButtons).toEqual(["next"]);
    });

    it("second step targets #nav-settings", () => {
      renderSeedTour();
      expect(capturedConfig.steps[1].element).toBe("#nav-settings");
    });

    it("sets SEED_SETTINGS_TOUR_KEY onHighlighted", () => {
      renderSeedTour();
      capturedConfig.steps[1].onHighlighted();
      expect(setItemSpy).toHaveBeenCalledWith(SEED_SETTINGS_TOUR_KEY, "true");
    });

    it("does not have onDestroyStarted on desktop", () => {
      renderSeedTour();
      expect(capturedConfig.onDestroyStarted).toBeUndefined();
    });
  });

  describe("mobile tour (< 768px)", () => {
    beforeEach(() => setMobile());

    it("creates 1 step on mobile", () => {
      renderSeedTour();
      expect(capturedConfig.steps).toHaveLength(1);
    });

    it("single step has close button", () => {
      renderSeedTour();
      expect(capturedConfig.steps[0].popover.showButtons).toEqual(["close"]);
    });

    it("mobile step description includes a link to /store/settings", () => {
      renderSeedTour();
      expect(capturedConfig.steps[0].popover.description).toContain("/store/settings");
    });

    it("mobile step description links to the given settings route", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/freelancer/timesheet");
      renderSeedTour({ homeRoute: "/freelancer/timesheet", settingsRoute: "/freelancer/settings" });
      expect(capturedConfig.steps[0].popover.description).toContain("/freelancer/settings");
    });

    it("mobile step description includes the button label", () => {
      renderSeedTour();
      expect(capturedConfig.steps[0].popover.description).toContain("mobileGoToSettings");
    });

    it("does not target any element on mobile", () => {
      renderSeedTour();
      expect(capturedConfig.steps[0].element).toBeUndefined();
    });

    it("has onDestroyStarted on mobile to destroy the driver", () => {
      renderSeedTour();
      expect(capturedConfig.onDestroyStarted).toBeDefined();
    });

    it("sets SEED_SETTINGS_TOUR_KEY when timer fires on mobile", () => {
      renderSeedTour();
      jest.runAllTimers();
      expect(setItemSpy).toHaveBeenCalledWith(SEED_SETTINGS_TOUR_KEY, "true");
    });
  });
});
