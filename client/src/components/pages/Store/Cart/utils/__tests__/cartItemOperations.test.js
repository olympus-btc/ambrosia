import {
  addCartItem,
  removeCartItem,
  setCartItemQuantity,
} from "../cartItemOperations";

describe("cartItemOperations", () => {
  describe("addCartItem", () => {
    it("appends a new item to an empty cart", () => {
      const product = { id: 1, imageUrl: "/img.png", name: "Jade", priceCents: 100 };

      const result = addCartItem([], product, null, 5, null);

      expect(result).toEqual([
        {
          id: 1,
          productId: 1,
          variantId: null,
          variantName: null,
          imageUrl: "/img.png",
          name: "Jade",
          price: 100,
          quantity: 1,
          subtotal: 100,
          maxQuantity: 5,
        },
      ]);
    });

    it("increments quantity and subtotal for an existing item", () => {
      const cart = [{ id: 1, name: "Jade", price: 100, quantity: 2, subtotal: 200, maxQuantity: 5 }];

      const result = addCartItem(cart, { id: 1, priceCents: 100 }, null, 5, null);

      expect(result[0].quantity).toBe(3);
      expect(result[0].subtotal).toBe(300);
    });

    it("returns the same cart reference when stock is exceeded", () => {
      const cart = [{ id: 2, name: "M5", price: 200, quantity: 3, subtotal: 600, maxQuantity: 3 }];

      const result = addCartItem(cart, { id: 2, priceCents: 200 }, null, 3, null);

      expect(result).toBe(cart);
    });

    it("preserves an existing imageUrl over the product imageUrl", () => {
      const cart = [{ id: 1, imageUrl: "/old.png", price: 100, quantity: 1, subtotal: 100, maxQuantity: 5 }];

      const result = addCartItem(cart, { id: 1, imageUrl: "/new.png", priceCents: 100 }, null, 5, null);

      expect(result[0].imageUrl).toBe("/old.png");
    });

    it("uses variant id as cart item id when a variant is provided", () => {
      const product = { id: "p1", name: "T-Shirt", priceCents: 1000 };
      const variant = { id: "v1", priceCents: 1500, quantity: 4 };

      const result = addCartItem([], product, variant, 4, "Red / L");

      expect(result[0].id).toBe("v1");
      expect(result[0].productId).toBe("p1");
      expect(result[0].variantId).toBe("v1");
      expect(result[0].variantName).toBe("Red / L");
      expect(result[0].price).toBe(1500);
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
