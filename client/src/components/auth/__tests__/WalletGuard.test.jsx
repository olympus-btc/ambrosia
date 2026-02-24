import { render, act } from "@testing-library/react";
import { driver } from "driver.js";

import WalletGuard from "@components/auth/WalletGuard";
import * as cashierService from "@modules/cashier/cashierService";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

const WALLET_GUARD_TOUR_KEY = "ambrosia:tour:wallet-guard";

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

const originalError = console.error;

beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("onAnimationComplete") ||
        args[0].includes("Unknown event handler property") ||
        args[0].includes("validateDOMNesting"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  jest.clearAllMocks();
  localStorageMock.clear();

  jest.spyOn(cashierService, "logoutWallet").mockResolvedValue({});
  jest.spyOn(cashierService, "loginWallet").mockResolvedValue({
    walletTokenExpiresAt: Date.now() + 8 * 60 * 60 * 1000,
  });
});

afterEach(() => {
  console.error = originalError;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function renderWalletGuard(props = {}) {
  return render(
    <WalletGuard {...props}>
      <div>Protected content</div>
    </WalletGuard>,
  );
}

describe("WalletGuard — driver.js tour", () => {
  it("always renders the #wallet-guard-anchor element", async () => {
    await act(async () => {
      renderWalletGuard();
    });

    expect(document.getElementById("wallet-guard-anchor")).toBeInTheDocument();
  });

  it("does not start the tour when WALLET_GUARD_TOUR_KEY is absent from localStorage", async () => {
    jest.useFakeTimers();

    await act(async () => {
      renderWalletGuard();
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(driver).not.toHaveBeenCalled();
  });

  it("calls driver() and drive() when WALLET_GUARD_TOUR_KEY is set and modal is open", async () => {
    jest.useFakeTimers();
    localStorageMock.setItem(WALLET_GUARD_TOUR_KEY, "true");

    await act(async () => {
      renderWalletGuard();
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(driver).toHaveBeenCalledTimes(1);
    expect(driver.mock.results[0].value.drive).toHaveBeenCalledTimes(1);
  });

  it("does not start the tour when the modal is closed (session restored from localStorage)", async () => {
    jest.useFakeTimers();

    // A future expiry causes the restore effect to set isOpen=false,
    // which cancels the 300ms tour timer before it fires.
    localStorageMock.setItem("walletAccessExpiry", String(Date.now() + 60 * 60 * 1000));
    localStorageMock.setItem(WALLET_GUARD_TOUR_KEY, "true");

    await act(async () => {
      renderWalletGuard();
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(driver).not.toHaveBeenCalled();
  });

  it("adds a resize event listener when the tour starts", async () => {
    jest.useFakeTimers();
    localStorageMock.setItem(WALLET_GUARD_TOUR_KEY, "true");

    const addEventListenerSpy = jest.spyOn(window, "addEventListener");

    await act(async () => {
      renderWalletGuard();
    });

    const resizeCountBeforeTimer = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === "resize",
    ).length;

    act(() => {
      jest.advanceTimersByTime(400);
    });

    const resizeCountAfterTimer = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === "resize",
    ).length;

    expect(resizeCountAfterTimer).toBeGreaterThan(resizeCountBeforeTimer);
  });

  it("removes the resize listener when onDestroyStarted fires", async () => {
    jest.useFakeTimers();
    localStorageMock.setItem(WALLET_GUARD_TOUR_KEY, "true");

    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

    await act(async () => {
      renderWalletGuard();
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    const { onDestroyStarted } = driver.mock.calls[0][0];
    act(() => {
      onDestroyStarted();
    });

    expect(
      removeEventListenerSpy.mock.calls.filter(([event]) => event === "resize"),
    ).toHaveLength(1);
  });

  it("clears WALLET_GUARD_TOUR_KEY from localStorage when onDestroyStarted fires", async () => {
    jest.useFakeTimers();
    localStorageMock.setItem(WALLET_GUARD_TOUR_KEY, "true");

    await act(async () => {
      renderWalletGuard();
    });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    const { onDestroyStarted } = driver.mock.calls[0][0];
    act(() => {
      onDestroyStarted();
    });

    expect(localStorageMock.getItem(WALLET_GUARD_TOUR_KEY)).toBeNull();
  });

  it("cancels the pending timer on unmount before driver is initialized", async () => {
    jest.useFakeTimers();
    localStorageMock.setItem(WALLET_GUARD_TOUR_KEY, "true");

    let unmount;
    await act(async () => {
      ({ unmount } = renderWalletGuard());
    });

    // Unmount before the 300ms timer fires
    act(() => {
      unmount();
    });

    // Advancing timers after unmount must not invoke driver
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(driver).not.toHaveBeenCalled();
  });
});
