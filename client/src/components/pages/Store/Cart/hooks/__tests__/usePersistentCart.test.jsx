import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { usePersistentCart, CART_STORAGE_KEY } from "../usePersistentCart";

const handlers = {};

function TestComponent() {
  const { cart, discount, hydrated, setCart, setDiscount, resetCartState } = usePersistentCart();
  useEffect(() => {
    handlers.setCart = setCart;
    handlers.setDiscount = setDiscount;
    handlers.resetCartState = resetCartState;
  }, [setCart, setDiscount, resetCartState]);
  return (
    <div>
      <span data-testid="count">{cart.length}</span>
      <span data-testid="discount">{discount}</span>
      <span data-testid="hydrated">{String(hydrated)}</span>
    </div>
  );
}

describe("usePersistentCart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hydrates cart and discount from localStorage", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items: [{ id: 1 }], discount: 15 }),
    );

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("1");
      expect(screen.getByTestId("discount")).toHaveTextContent("15");
    });
  });

  it("persists cart changes after hydration", async () => {
    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("0");
    });

    act(() => {
      handlers.setCart([{ id: 2 }]);
      handlers.setDiscount(5);
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
      expect(stored).toEqual({ items: [{ id: 2 }], discount: 5 });
    });
  });

  it("resets cart and clears storage", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items: [{ id: 1 }], discount: 10 }),
    );

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("1");
    });

    act(() => {
      handlers.resetCartState();
    });

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("0");
      expect(screen.getByTestId("discount")).toHaveTextContent("0");
      expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY))).toEqual({
        items: [],
        discount: 0,
      });
    });
  });

  it("handles storage read errors gracefully", async () => {
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = jest.fn(() => {
      throw new Error("read-fail");
    });

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("0");
      expect(screen.getByTestId("discount")).toHaveTextContent("0");
    });

    localStorage.getItem = originalGetItem;
  });

  it("handles storage write errors gracefully", async () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = jest.fn(() => {
      throw new Error("write-fail");
    });

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("0");
    });

    act(() => {
      handlers.setCart([{ id: 3 }]);
    });

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("1");
    });

    localStorage.setItem = originalSetItem;
  });

  it("exposes hydrated=false before effect and hydrated=true after", async () => {
    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId("hydrated")).toHaveTextContent("true");
    });
  });

  it("handles storage clear errors gracefully", async () => {
    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = jest.fn(() => {
      throw new Error("remove-fail");
    });

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("0");
    });

    act(() => {
      handlers.resetCartState();
    });

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("0");
      expect(screen.getByTestId("discount")).toHaveTextContent("0");
    });

    localStorage.removeItem = originalRemoveItem;
  });
});
