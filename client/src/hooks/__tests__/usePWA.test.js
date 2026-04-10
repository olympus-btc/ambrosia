import { renderHook, act } from "@testing-library/react";

import { useInstallPrompt, useIsAndroid, useIsIOS, useIsStandalone } from "../usePWA";

function mockMatchMedia(matches) {
  const listeners = [];
  const mq = {
    matches,
    addEventListener: jest.fn((_, cb) => listeners.push(cb)),
    removeEventListener: jest.fn((_, cb) => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    _trigger: (newMatches) => {
      mq.matches = newMatches;
      listeners.forEach((cb) => cb());
    },
  };
  window.matchMedia = jest.fn(() => mq);
  return mq;
}

function mockUserAgent(ua) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useIsStandalone", () => {
  it("returns false when not in standalone mode", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useIsStandalone());
    expect(result.current).toBe(false);
  });

  it("returns true when display-mode: standalone matches", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsStandalone());
    expect(result.current).toBe(true);
  });

  it("returns true when navigator.standalone is true", () => {
    mockMatchMedia(false);
    Object.defineProperty(window.navigator, "standalone", {
      value: true,
      configurable: true,
    });
    const { result } = renderHook(() => useIsStandalone());
    expect(result.current).toBe(true);
    Object.defineProperty(window.navigator, "standalone", { value: undefined, configurable: true });
  });

  it("updates when media query changes", () => {
    const mq = mockMatchMedia(false);
    const { result } = renderHook(() => useIsStandalone());
    expect(result.current).toBe(false);

    act(() => mq._trigger(true));
    expect(result.current).toBe(true);
  });

  it("unsubscribes from media query on unmount", () => {
    const mq = mockMatchMedia(false);
    const { unmount } = renderHook(() => useIsStandalone());
    unmount();
    expect(mq.removeEventListener).toHaveBeenCalled();
  });
});

describe("useIsIOS", () => {
  it("returns false for non-iOS user agent", () => {
    mockUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    const { result } = renderHook(() => useIsIOS());
    expect(result.current).toBe(false);
  });

  it("returns true for iPhone user agent", () => {
    mockUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    const { result } = renderHook(() => useIsIOS());
    expect(result.current).toBe(true);
  });

  it("returns true for iPad user agent", () => {
    mockUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)");
    const { result } = renderHook(() => useIsIOS());
    expect(result.current).toBe(true);
  });

  it("returns true for iPod user agent", () => {
    mockUserAgent("Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)");
    const { result } = renderHook(() => useIsIOS());
    expect(result.current).toBe(true);
  });

  it("is case-insensitive", () => {
    mockUserAgent("IPHONE IPAD IPOD");
    const { result } = renderHook(() => useIsIOS());
    expect(result.current).toBe(true);
  });
});

describe("useIsAndroid", () => {
  it("returns false for non-Android user agent", () => {
    mockUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    const { result } = renderHook(() => useIsAndroid());
    expect(result.current).toBe(false);
  });

  it("returns true for Android user agent", () => {
    mockUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8)");
    const { result } = renderHook(() => useIsAndroid());
    expect(result.current).toBe(true);
  });

  it("is case-insensitive", () => {
    mockUserAgent("ANDROID 14");
    const { result } = renderHook(() => useIsAndroid());
    expect(result.current).toBe(true);
  });
});

describe("useInstallPrompt", () => {
  it("starts with isInstallable=false", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstallable).toBe(false);
  });

  it("sets isInstallable=true when beforeinstallprompt fires", () => {
    const { result } = renderHook(() => useInstallPrompt());

    const event = new Event("beforeinstallprompt");
    event.preventDefault = jest.fn();
    event.prompt = jest.fn();
    event.userChoice = Promise.resolve({ outcome: "dismissed" });

    act(() => { window.dispatchEvent(event); });

    expect(result.current.isInstallable).toBe(true);
  });

  it("calls event.preventDefault() to suppress the browser prompt", () => {
    renderHook(() => useInstallPrompt());

    const event = new Event("beforeinstallprompt");
    event.preventDefault = jest.fn();
    event.prompt = jest.fn();
    event.userChoice = Promise.resolve({ outcome: "dismissed" });

    act(() => { window.dispatchEvent(event); });

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("promptInstall calls event.prompt()", async () => {
    const { result } = renderHook(() => useInstallPrompt());

    const mockPrompt = jest.fn();
    const event = new Event("beforeinstallprompt");
    event.preventDefault = jest.fn();
    event.prompt = mockPrompt;
    event.userChoice = Promise.resolve({ outcome: "dismissed" });

    act(() => { window.dispatchEvent(event); });

    await act(async () => { await result.current.promptInstall(); });

    expect(mockPrompt).toHaveBeenCalled();
  });

  it("resets isInstallable to false after user accepts install", async () => {
    const { result } = renderHook(() => useInstallPrompt());

    const event = new Event("beforeinstallprompt");
    event.preventDefault = jest.fn();
    event.prompt = jest.fn();
    event.userChoice = Promise.resolve({ outcome: "accepted" });

    act(() => { window.dispatchEvent(event); });
    expect(result.current.isInstallable).toBe(true);

    await act(async () => { await result.current.promptInstall(); });

    expect(result.current.isInstallable).toBe(false);
  });

  it("keeps isInstallable=true when user dismisses the prompt", async () => {
    const { result } = renderHook(() => useInstallPrompt());

    const event = new Event("beforeinstallprompt");
    event.preventDefault = jest.fn();
    event.prompt = jest.fn();
    event.userChoice = Promise.resolve({ outcome: "dismissed" });

    act(() => { window.dispatchEvent(event); });

    await act(async () => { await result.current.promptInstall(); });

    expect(result.current.isInstallable).toBe(true);
  });

  it("does nothing when promptInstall is called with no pending event", async () => {
    const { result } = renderHook(() => useInstallPrompt());

    await act(async () => { await result.current.promptInstall(); });

    expect(result.current.isInstallable).toBe(false);
  });

  it("removes the event listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useInstallPrompt());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function),
    );
  });
});
