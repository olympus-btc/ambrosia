import { renderHook, act } from "@testing-library/react";

import { useCartOperations } from "../useCartOperations";

const mockAddToast = jest.fn();

jest.mock("@heroui/react", () => ({
  addToast: (...toastArgs) => mockAddToast(...toastArgs),
}));

const products = [
  { id: 1, name: "Jade Wallet", priceCents: 100, quantity: 5 },
  { id: 2, name: "M5 Stick", priceCents: 200, quantity: 3 },
  { id: 3, name: "Out of Stock Item", priceCents: 50, quantity: 0 },
];

function setupHook(cart = []) {
  const setCart = jest.fn();
  const { result } = renderHook(() => useCartOperations({ cart, setCart, products }));
  return { result, setCart };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useCartOperations", () => {
  describe("addProduct", () => {
    it("adds a new product to an empty cart", () => {
      const { result, setCart } = setupHook([]);

      act(() => {
        result.current.addProduct({ id: 1, imageUrl: "/img.png", name: "Jade Wallet", priceCents: 100 });
      });

      expect(setCart).toHaveBeenCalledWith([
        {
          id: 1,
          productId: 1,
          variantId: null,
          variantName: null,
          imageUrl: "/img.png",
          name: "Jade Wallet",
          price: 100,
          quantity: 1,
          subtotal: 100,
          maxQuantity: 5,
        },
      ]);
    });

    it("increments quantity when product already exists in cart", () => {
      const cart = [{ id: 1, imageUrl: "/img.png", name: "Jade Wallet", price: 100, quantity: 2, subtotal: 200 }];
      const { result, setCart } = setupHook(cart);

      act(() => {
        result.current.addProduct({ id: 1, imageUrl: "/img.png", name: "Jade Wallet", priceCents: 100 });
      });

      const updatedCartItems = setCart.mock.calls[0][0];
      expect(updatedCartItems[0].quantity).toBe(3);
      expect(updatedCartItems[0].subtotal).toBe(300);
    });

    it("does not add a product that is out of stock", () => {
      const { result, setCart } = setupHook([]);

      act(() => {
        result.current.addProduct({ id: 3, name: "Out of Stock Item", priceCents: 50 });
      });

      expect(setCart).not.toHaveBeenCalled();
      jest.runAllTimers();
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ color: "danger" }));
    });

    it("does not exceed available stock when incrementing", () => {
      const cart = [{ id: 2, name: "M5 Stick", price: 200, quantity: 3, subtotal: 600 }];
      const { result, setCart } = setupHook(cart);

      act(() => {
        result.current.addProduct({ id: 2, name: "M5 Stick", priceCents: 200 });
      });

      expect(setCart).not.toHaveBeenCalled();
      jest.runAllTimers();
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ color: "danger" }));
    });
  });

  describe("updateQuantity", () => {
    it("updates quantity and recalculates subtotal", () => {
      const cart = [{ id: 1, name: "Jade Wallet", price: 100, quantity: 1, subtotal: 100 }];
      const { result, setCart } = setupHook(cart);

      act(() => {
        result.current.updateQuantity(1, 4);
      });

      const updatedCartItems = setCart.mock.calls[0][0];
      expect(updatedCartItems[0].quantity).toBe(4);
      expect(updatedCartItems[0].subtotal).toBe(400);
    });

    it("removes the item when quantity is set to zero", () => {
      const cart = [{ id: 1, name: "Jade Wallet", price: 100, quantity: 2, subtotal: 200 }];
      const { result, setCart } = setupHook(cart);

      act(() => {
        result.current.updateQuantity(1, 0);
      });

      expect(setCart).toHaveBeenCalledWith([]);
    });

    it("caps quantity at available stock and notifies", () => {
      const cart = [{ id: 2, name: "M5 Stick", price: 200, quantity: 1, subtotal: 200 }];
      const { result, setCart } = setupHook(cart);

      act(() => {
        result.current.updateQuantity(2, 10);
      });

      const updatedCartItems = setCart.mock.calls[0][0];
      expect(updatedCartItems[0].quantity).toBe(3);
      expect(updatedCartItems[0].subtotal).toBe(600);
      jest.runAllTimers();
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ color: "danger" }));
    });

    it("ignores non-finite quantity values", () => {
      const cart = [{ id: 1, price: 100, quantity: 1, subtotal: 100 }];
      const { result, setCart } = setupHook(cart);

      act(() => {
        result.current.updateQuantity(1, NaN);
      });

      expect(setCart).not.toHaveBeenCalled();
    });
  });

  describe("removeProduct", () => {
    it("removes a product from the cart", () => {
      const cart = [
        { id: 1, name: "Jade Wallet", price: 100, quantity: 1, subtotal: 100 },
        { id: 2, name: "M5 Stick", price: 200, quantity: 1, subtotal: 200 },
      ];
      const { result, setCart } = setupHook(cart);

      act(() => {
        result.current.removeProduct(1);
      });

      expect(setCart).toHaveBeenCalledWith([
        { id: 2, name: "M5 Stick", price: 200, quantity: 1, subtotal: 200 },
      ]);
    });
  });

  describe("clearCart", () => {
    it("empties the cart", () => {
      const cart = [
        { id: 1, name: "Jade Wallet", price: 100, quantity: 1, subtotal: 100 },
      ];
      const { result, setCart } = setupHook(cart);

      act(() => {
        result.current.clearCart();
      });

      expect(setCart).toHaveBeenCalledWith([]);
    });
  });
});
