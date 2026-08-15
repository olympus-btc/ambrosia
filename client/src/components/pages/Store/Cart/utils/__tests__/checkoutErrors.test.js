import {
  CHECKOUT_ERROR_TRANSLATIONS,
  getCheckoutErrorDescription,
} from "../checkoutErrors";

describe("checkoutErrors", () => {
  it("returns a translation key for a known server error code", () => {
    expect(getCheckoutErrorDescription({
      code: "checkout_insufficient_stock",
      responseMessage: "Insufficient stock for checkout",
    }, "errors.checkout")).toBe("errors.checkoutInsufficientStock");
  });

  it("falls back to the server message for an unknown code", () => {
    expect(getCheckoutErrorDescription({
      code: "checkout_new_error",
      responseMessage: "A new checkout error",
    }, "errors.checkout")).toBe("A new checkout error");
  });

  it("falls back to the Error message and then the supplied key", () => {
    expect(getCheckoutErrorDescription(new Error("errors.checkout"), "errors.process"))
      .toBe("errors.checkout");
    expect(getCheckoutErrorDescription(null, "errors.process")).toBe("errors.process");
  });

  it("defines translations for all checkout rejection codes", () => {
    expect(Object.keys(CHECKOUT_ERROR_TRANSLATIONS)).toEqual([
      "checkout_empty",
      "checkout_invalid_quantity",
      "checkout_invalid_reference",
      "checkout_product_not_found",
      "checkout_variant_not_found",
      "checkout_insufficient_stock",
    ]);
  });
});
