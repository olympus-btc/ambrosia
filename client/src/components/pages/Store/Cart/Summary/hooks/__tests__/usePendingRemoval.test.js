import { renderHook, act } from "@testing-library/react";

import { usePendingRemoval } from "../usePendingRemoval";

const mockCloseToast = jest.fn();

jest.mock("@heroui/react", () => ({
  closeToast: (...args) => mockCloseToast(...args),
}));

beforeEach(() => {
  jest.useFakeTimers();
  mockCloseToast.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("usePendingRemoval", () => {
  it("starts with an empty set", () => {
    const { result } = renderHook(() => usePendingRemoval());
    expect(result.current.pendingRemovals.size).toBe(0);
  });

  it("adds the item id to pendingRemovals when startRemoval is called", () => {
    const { result } = renderHook(() => usePendingRemoval());

    act(() => {
      result.current.startRemoval(42, jest.fn());
    });

    expect(result.current.pendingRemovals.has(42)).toBe(true);
  });

  it("calls onConfirm and removes the id after 5 seconds", () => {
    const onConfirm = jest.fn();
    const { result } = renderHook(() => usePendingRemoval());

    act(() => {
      result.current.startRemoval(42, onConfirm);
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onConfirm).toHaveBeenCalled();
    expect(result.current.pendingRemovals.has(42)).toBe(false);
  });

  it("does not call onConfirm before 5 seconds", () => {
    const onConfirm = jest.fn();
    const { result } = renderHook(() => usePendingRemoval());

    act(() => {
      result.current.startRemoval(42, onConfirm);
    });

    act(() => {
      jest.advanceTimersByTime(4999);
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cancels the timer and removes the id when cancelRemoval is called", () => {
    const onConfirm = jest.fn();
    const { result } = renderHook(() => usePendingRemoval());

    act(() => {
      result.current.startRemoval(42, onConfirm);
    });

    act(() => {
      result.current.cancelRemoval(42);
    });

    expect(result.current.pendingRemovals.has(42)).toBe(false);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cancels all timers and empties the set when clearPendingRemovals is called", () => {
    const onConfirm1 = jest.fn();
    const onConfirm2 = jest.fn();
    const { result } = renderHook(() => usePendingRemoval());

    act(() => {
      result.current.startRemoval(1, onConfirm1);
      result.current.startRemoval(2, onConfirm2);
    });

    act(() => {
      result.current.clearPendingRemovals();
    });

    expect(result.current.pendingRemovals.size).toBe(0);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onConfirm1).not.toHaveBeenCalled();
    expect(onConfirm2).not.toHaveBeenCalled();
  });

  it("closes the toast when cancelRemoval is called", () => {
    const { result } = renderHook(() => usePendingRemoval());

    act(() => {
      result.current.startRemoval(42, jest.fn(), "toast-key-42");
    });

    act(() => {
      result.current.cancelRemoval(42);
    });

    expect(mockCloseToast).toHaveBeenCalledWith("toast-key-42");
  });

  it("closes the toast when the removal is confirmed after 5 seconds", () => {
    const { result } = renderHook(() => usePendingRemoval());

    act(() => {
      result.current.startRemoval(42, jest.fn(), "toast-key-42");
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockCloseToast).toHaveBeenCalledWith("toast-key-42");
  });

  it("closes every toast when clearPendingRemovals is called", () => {
    const { result } = renderHook(() => usePendingRemoval());

    act(() => {
      result.current.startRemoval(1, jest.fn(), "toast-key-1");
      result.current.startRemoval(2, jest.fn(), "toast-key-2");
    });

    act(() => {
      result.current.clearPendingRemovals();
    });

    expect(mockCloseToast).toHaveBeenCalledWith("toast-key-1");
    expect(mockCloseToast).toHaveBeenCalledWith("toast-key-2");
  });

  it("handles multiple independent removals simultaneously", () => {
    const onConfirm1 = jest.fn();
    const onConfirm2 = jest.fn();
    const { result } = renderHook(() => usePendingRemoval());

    act(() => {
      result.current.startRemoval(1, onConfirm1);
      result.current.startRemoval(2, onConfirm2);
    });

    expect(result.current.pendingRemovals.has(1)).toBe(true);
    expect(result.current.pendingRemovals.has(2)).toBe(true);

    act(() => {
      result.current.cancelRemoval(1);
    });

    expect(result.current.pendingRemovals.has(1)).toBe(false);
    expect(result.current.pendingRemovals.has(2)).toBe(true);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onConfirm1).not.toHaveBeenCalled();
    expect(onConfirm2).toHaveBeenCalled();
  });
});
