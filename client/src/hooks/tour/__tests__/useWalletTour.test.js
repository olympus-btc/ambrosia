import { renderHook } from "@testing-library/react";

import { useWalletTour } from "../useWalletTour";

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

const WALLET_TOUR_KEY = "ambrosia:tour:wallet-channel";
const WALLET_GUARD_TOUR_KEY = "ambrosia:tour:wallet-guard";
const WALLET_RECEIVE_TOUR_KEY = "ambrosia:tour:wallet-receive";

function setDesktop() {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 });
}

function setMobile() {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });
}

let setItemSpy;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  capturedConfig = {};
  setDesktop();
  setItemSpy = jest.spyOn(Storage.prototype, "setItem");
  const { usePathname } = require("next/navigation");
  usePathname.mockReturnValue("/store");
});

afterEach(() => {
  setItemSpy.mockRestore();
});

describe("useWalletTour", () => {
  describe("wallet pathname effect", () => {
    it("sets guard and receive keys on first wallet visit (WALLET_TOUR_KEY = 'true')", () => {
      localStorage.setItem(WALLET_TOUR_KEY, "true");
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/wallet");
      renderHook(() => useWalletTour(false));
      expect(setItemSpy).toHaveBeenCalledWith(WALLET_GUARD_TOUR_KEY, "true");
      expect(setItemSpy).toHaveBeenCalledWith(WALLET_RECEIVE_TOUR_KEY, "true");
      expect(setItemSpy).toHaveBeenCalledWith(WALLET_TOUR_KEY, "visited");
    });

    it("does not set guard/receive keys on subsequent wallet visits (WALLET_TOUR_KEY = 'visited')", () => {
      localStorage.setItem(WALLET_TOUR_KEY, "visited");
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/wallet");
      renderHook(() => useWalletTour(false));
      expect(setItemSpy).not.toHaveBeenCalledWith(WALLET_GUARD_TOUR_KEY, "true");
      expect(setItemSpy).not.toHaveBeenCalledWith(WALLET_RECEIVE_TOUR_KEY, "true");
    });

    it("does not set guard/receive keys when tour has not been seen yet", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/wallet");
      renderHook(() => useWalletTour(false));
      expect(setItemSpy).not.toHaveBeenCalledWith(WALLET_GUARD_TOUR_KEY, "true");
      expect(setItemSpy).not.toHaveBeenCalledWith(WALLET_RECEIVE_TOUR_KEY, "true");
    });

    it("does not set guard/receive keys on other paths", () => {
      renderHook(() => useWalletTour(false));
      expect(setItemSpy).not.toHaveBeenCalledWith(WALLET_GUARD_TOUR_KEY, "true");
    });
  });

  describe("tour initialization", () => {
    it("does not start tour when not authenticated", () => {
      renderHook(() => useWalletTour(false));
      expect(mockDrive).not.toHaveBeenCalled();
    });

    it("starts tour when authenticated for the first time", () => {
      renderHook(() => useWalletTour(true));
      expect(mockDrive).toHaveBeenCalledTimes(1);
    });

    it("does not start tour if already seen", () => {
      localStorage.setItem(WALLET_TOUR_KEY, "true");
      renderHook(() => useWalletTour(true));
      expect(mockDrive).not.toHaveBeenCalled();
    });

    it("sets WALLET_TOUR_KEY in localStorage when starting", () => {
      renderHook(() => useWalletTour(true));
      expect(setItemSpy).toHaveBeenCalledWith(WALLET_TOUR_KEY, "true");
    });
  });

  describe("desktop tour (>= 768px)", () => {
    it("creates 2 steps on desktop", () => {
      renderHook(() => useWalletTour(true));
      expect(capturedConfig.steps).toHaveLength(2);
    });

    it("first step has next button", () => {
      renderHook(() => useWalletTour(true));
      expect(capturedConfig.steps[0].popover.showButtons).toEqual(["next"]);
    });

    it("second step targets #nav-wallet", () => {
      renderHook(() => useWalletTour(true));
      expect(capturedConfig.steps[1].element).toBe("#nav-wallet");
    });

    it("sets guard, receive and visited keys onHighlighted", () => {
      renderHook(() => useWalletTour(true));
      capturedConfig.steps[1].onHighlighted();
      expect(setItemSpy).toHaveBeenCalledWith(WALLET_TOUR_KEY, "visited");
      expect(setItemSpy).toHaveBeenCalledWith(WALLET_GUARD_TOUR_KEY, "true");
      expect(setItemSpy).toHaveBeenCalledWith(WALLET_RECEIVE_TOUR_KEY, "true");
    });

    it("does not have onDestroyed on desktop", () => {
      renderHook(() => useWalletTour(true));
      expect(capturedConfig.onDestroyed).toBeUndefined();
    });

    it("sets nextBtnText without arrow", () => {
      renderHook(() => useWalletTour(true));
      expect(capturedConfig.nextBtnText).toBe("nextButton");
      expect(capturedConfig.nextBtnText).not.toContain("→");
    });
  });

  describe("mobile tour (< 768px)", () => {
    beforeEach(() => setMobile());

    it("creates 1 step on mobile", () => {
      renderHook(() => useWalletTour(true));
      expect(capturedConfig.steps).toHaveLength(1);
    });

    it("single step has close button", () => {
      renderHook(() => useWalletTour(true));
      expect(capturedConfig.steps[0].popover.showButtons).toEqual(["close"]);
    });

    it("mobile step description includes a link to /store/wallet", () => {
      renderHook(() => useWalletTour(true));
      expect(capturedConfig.steps[0].popover.description).toContain("/store/wallet");
    });

    it("mobile step description includes the button label", () => {
      renderHook(() => useWalletTour(true));
      expect(capturedConfig.steps[0].popover.description).toContain("mobileGoToWallet");
    });

    it("mobile step description includes the original description", () => {
      renderHook(() => useWalletTour(true));
      expect(capturedConfig.steps[0].popover.description).toContain("description");
    });

    it("does not target any element on mobile", () => {
      renderHook(() => useWalletTour(true));
      expect(capturedConfig.steps[0].element).toBeUndefined();
    });

    it("does not have onDestroyed on mobile (keys set via pathname effect)", () => {
      renderHook(() => useWalletTour(true));
      expect(capturedConfig.onDestroyed).toBeUndefined();
    });
  });
});
