import {
  DEFAULT_TIP_PERCENTAGES,
  getDiscountedSubtotal,
  isValidTipPercentages,
  normalizeTipPercentages,
  parseTipPercentages,
  resolveTipAmount,
} from "../tipCalculations";

describe("tipCalculations", () => {
  describe("getDiscountedSubtotal", () => {
    it("returns subtotal minus discount", () => {
      expect(getDiscountedSubtotal(10000, 1000)).toBe(9000);
    });

    it("returns 0 when discount equals or exceeds subtotal", () => {
      expect(getDiscountedSubtotal(5000, 5000)).toBe(0);
      expect(getDiscountedSubtotal(5000, 6000)).toBe(0);
    });

    it("handles invalid or missing values gracefully", () => {
      expect(getDiscountedSubtotal(null, undefined)).toBe(0);
      expect(getDiscountedSubtotal("abc", "def")).toBe(0);
    });
  });

  describe("resolveTipAmount", () => {
    it("calculates percentage tip from base amount in cents", () => {
      expect(resolveTipAmount(10000, 10, "percentage")).toBe(1000);
      expect(resolveTipAmount(10000, 15, "percentage")).toBe(1500);
      expect(resolveTipAmount(10000, 20, "percentage")).toBe(2000);
    });

    it("calculates fixed tip from dollars/pesos input into cents", () => {
      expect(resolveTipAmount(10000, 5, "fixed")).toBe(500);
      expect(resolveTipAmount(10000, 12.5, "fixed")).toBe(1250);
    });

    it("returns 0 for negative, zero, or non-finite tip values", () => {
      expect(resolveTipAmount(10000, 0, "percentage")).toBe(0);
      expect(resolveTipAmount(10000, -10, "percentage")).toBe(0);
      expect(resolveTipAmount(10000, null, "fixed")).toBe(0);
    });

    it("returns 0 when base amount is 0", () => {
      expect(resolveTipAmount(0, 15, "percentage")).toBe(0);
    });
  });

  describe("parseTipPercentages", () => {
    it("parses valid comma-separated string into numbers", () => {
      expect(parseTipPercentages("5, 10, 15, 20")).toEqual([5, 10, 15, 20]);
    });

    it("returns DEFAULT_TIP_PERCENTAGES when input is empty or invalid", () => {
      expect(parseTipPercentages("")).toEqual(DEFAULT_TIP_PERCENTAGES);
      expect(parseTipPercentages(null)).toEqual(DEFAULT_TIP_PERCENTAGES);
      expect(parseTipPercentages("abc, -1, 0")).toEqual(DEFAULT_TIP_PERCENTAGES);
      expect(parseTipPercentages("10, 101")).toEqual(DEFAULT_TIP_PERCENTAGES);
      expect(parseTipPercentages("10, 10")).toEqual(DEFAULT_TIP_PERCENTAGES);
    });
  });

  describe("tip percentage validation", () => {
    it("accepts and normalizes unique percentages between 1 and 100", () => {
      expect(isValidTipPercentages("5, 10.5, 100")).toBe(true);
      expect(normalizeTipPercentages("5, 10.5, 100")).toBe("5,10.5,100");
    });

    it.each(["", "abc", "0,10", "10,101", "10,10", "10,,20"])(
      "rejects invalid configuration %s",
      (invalidSerializedPercentages) => {
        expect(isValidTipPercentages(invalidSerializedPercentages)).toBe(false);
        expect(normalizeTipPercentages(invalidSerializedPercentages)).toBeNull();
      },
    );
  });
});
