import {
  addCartItem,
  removeCartItem,
  setCartItemQuantity,
} from "../cartItemOperations";

describe("cartItemOperations", () => {
  describe("addCartItem", () => {
    it("appends a new item to an empty cart", () => {
      const product = { id: 1, imageUrl: "/img.png", name: "Jade", priceCents: 100 };

      const result = addCartItem([], product, 5);

      expect(result).toEqual([
        { id: 1, imageUrl: "/img.png", name: "Jade", price: 100, quantity: 1, subtotal: 100 },
      ]);
    });

    it("increments quantity and subtotal for an existing item", () => {
      const cart = [{ id: 1, name: "Jade", price: 100, quantity: 2, subtotal: 200 }];

      const result = addCartItem(cart, { id: 1, priceCents: 100 }, 5);

      expect(result[0].quantity).toBe(3);
      expect(result[0].subtotal).toBe(300);
    });

    it("returns the same cart reference when stock is exceeded", () => {
      const cart = [{ id: 2, name: "M5", price: 200, quantity: 3, subtotal: 600 }];

      const result = addCartItem(cart, { id: 2, priceCents: 200 }, 3);

      expect(result).toBe(cart);
    });

    it("preserves an existing imageUrl over the product imageUrl", () => {
      const cart = [{ id: 1, imageUrl: "/old.png", price: 100, quantity: 1, subtotal: 100 }];

      const result = addCartItem(cart, { id: 1, imageUrl: "/new.png", priceCents: 100 }, 5);

      expect(result[0].imageUrl).toBe("/old.png");
    });
  });

  describe("setCartItemQuantity", () => {
    it("updates quantity and subtotal", () => {
      const cart = [{ id: 1, price: 100, quantity: 1, subtotal: 100 }];

      const result = setCartItemQuantity(cart, 1, 4, 5);

      expect(result[0].quantity).toBe(4);
      expect(result[0].subtotal).toBe(400);
    });

    it("caps the quantity at the available stock", () => {
      const cart = [{ id: 2, price: 200, quantity: 1, subtotal: 200 }];

      const result = setCartItemQuantity(cart, 2, 10, 3);

      expect(result[0].quantity).toBe(3);
      expect(result[0].subtotal).toBe(600);
    });

    it("leaves unrelated items untouched", () => {
      const cart = [
        { id: 1, price: 100, quantity: 1, subtotal: 100 },
        { id: 2, price: 200, quantity: 1, subtotal: 200 },
      ];

      const result = setCartItemQuantity(cart, 1, 2, 5);

      expect(result[1]).toBe(cart[1]);
    });
  });

  describe("removeCartItem", () => {
    it("removes the matching item", () => {
      const cart = [
        { id: 1, price: 100, quantity: 1, subtotal: 100 },
        { id: 2, price: 200, quantity: 1, subtotal: 200 },
      ];

      const result = removeCartItem(cart, 1);

      expect(result).toEqual([{ id: 2, price: 200, quantity: 1, subtotal: 200 }]);
    });
  });
});
