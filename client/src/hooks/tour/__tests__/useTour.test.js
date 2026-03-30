import { renderHook } from "@testing-library/react";

import { useTour } from "../useTour";

const mockDrive = jest.fn();
const mockDestroy = jest.fn();
let capturedConfig = {};

jest.mock("driver.js", () => ({
  driver: jest.fn((config) => {
    capturedConfig = config;
    return { drive: mockDrive, destroy: mockDestroy };
  }),
}));

const TOUR_KEY = "ambrosia:tour:test";

let setItemSpy;
let removeItemSpy;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  localStorage.clear();
  capturedConfig = {};
  setItemSpy = jest.spyOn(Storage.prototype, "setItem");
  removeItemSpy = jest.spyOn(Storage.prototype, "removeItem");
});

afterEach(() => {
  jest.useRealTimers();
  setItemSpy.mockRestore();
  removeItemSpy.mockRestore();
});

const defaultOptions = {
  key: TOUR_KEY,
  driverOptions: { steps: [{ popover: { title: "Test" } }] },
};

describe("useTour", () => {
  describe("tour start conditions", () => {
    it("does not start tour when condition is false", () => {
      localStorage.setItem(TOUR_KEY, "true");
      renderHook(() => useTour({ ...defaultOptions, condition: false }));
      jest.runAllTimers();
      expect(mockDrive).not.toHaveBeenCalled();
    });

    it("does not start tour when localStorage key is not set", () => {
      renderHook(() => useTour({ ...defaultOptions, condition: true }));
      jest.runAllTimers();
      expect(mockDrive).not.toHaveBeenCalled();
    });

    it("starts tour when condition is true and key exists", () => {
      localStorage.setItem(TOUR_KEY, "true");
      renderHook(() => useTour({ ...defaultOptions, condition: true }));
      jest.runAllTimers();
      expect(mockDrive).toHaveBeenCalledTimes(1);
    });

    it("starts tour with default condition (true) when not provided", () => {
      localStorage.setItem(TOUR_KEY, "true");
      renderHook(() => useTour(defaultOptions));
      jest.runAllTimers();
      expect(mockDrive).toHaveBeenCalledTimes(1);
    });
  });

  describe("delay", () => {
    it("respects delay before starting", () => {
      localStorage.setItem(TOUR_KEY, "true");
      renderHook(() => useTour({ ...defaultOptions, delay: 500 }));
      jest.advanceTimersByTime(499);
      expect(mockDrive).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(mockDrive).toHaveBeenCalledTimes(1);
    });

    it("clears timer on unmount", () => {
      localStorage.setItem(TOUR_KEY, "true");
      const { unmount } = renderHook(() => useTour({ ...defaultOptions, delay: 500 }));
      unmount();
      jest.runAllTimers();
      expect(mockDrive).not.toHaveBeenCalled();
    });
  });

  describe("onBeforeStart", () => {
    it("calls onBeforeStart before starting the tour", () => {
      const onBeforeStart = jest.fn();
      localStorage.setItem(TOUR_KEY, "true");
      renderHook(() => useTour({ ...defaultOptions, onBeforeStart }));
      jest.runAllTimers();
      expect(onBeforeStart).toHaveBeenCalledTimes(1);
    });

    it("calls teardown (onBeforeStart return value) on destroy", () => {
      const teardown = jest.fn();
      const onBeforeStart = jest.fn(() => teardown);
      localStorage.setItem(TOUR_KEY, "true");
      renderHook(() => useTour({ ...defaultOptions, onBeforeStart }));
      jest.runAllTimers();
      capturedConfig.onDestroyStarted();
      expect(teardown).toHaveBeenCalledTimes(1);
    });
  });

  describe("onDestroyStarted", () => {
    it("removes localStorage key on destroy", () => {
      localStorage.setItem(TOUR_KEY, "true");
      renderHook(() => useTour(defaultOptions));
      jest.runAllTimers();
      capturedConfig.onDestroyStarted();
      expect(removeItemSpy).toHaveBeenCalledWith(TOUR_KEY);
    });

    it("calls driver.destroy on destroy", () => {
      localStorage.setItem(TOUR_KEY, "true");
      renderHook(() => useTour(defaultOptions));
      jest.runAllTimers();
      capturedConfig.onDestroyStarted();
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it("calls options.onDestroyStarted if provided", () => {
      const onDestroyStarted = jest.fn();
      localStorage.setItem(TOUR_KEY, "true");
      renderHook(() => useTour({
        ...defaultOptions,
        driverOptions: { ...defaultOptions.driverOptions, onDestroyStarted },
      }),
      );
      jest.runAllTimers();
      capturedConfig.onDestroyStarted();
      expect(onDestroyStarted).toHaveBeenCalledTimes(1);
    });

    it("works without options.onDestroyStarted", () => {
      localStorage.setItem(TOUR_KEY, "true");
      renderHook(() => useTour(defaultOptions));
      jest.runAllTimers();
      expect(() => capturedConfig.onDestroyStarted()).not.toThrow();
    });
  });
});
