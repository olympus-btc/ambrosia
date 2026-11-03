import { isPriceStepAligned, toFiniteNumber, toNumberInputValue } from "../numberParsers";

describe("toFiniteNumber", () => {
  it("parses numeric strings", () => {
    expect(toFiniteNumber("12.5")).toBe(12.5);
  });

  it("falls back when the value is not finite", () => {
    expect(toFiniteNumber("abc", 7)).toBe(7);
    expect(toFiniteNumber(NaN, 7)).toBe(7);
  });
});

describe("toNumberInputValue", () => {
  const domChangeEvent = (value) => ({ target: { value } });

  it("reads the value from a DOM event (typing path)", () => {
    expect(toNumberInputValue(domChangeEvent("42"))).toBe(42);
  });

  it("strips grouping separators and currency characters from the DOM value", () => {
    expect(toNumberInputValue(domChangeEvent("$1,234.56"))).toBe(1234.56);
  });

  it("keeps negative DOM values", () => {
    expect(toNumberInputValue(domChangeEvent("-3"))).toBe(-3);
  });

  it("passes numbers through untouched (stepper path)", () => {
    expect(toNumberInputValue(7)).toBe(7);
    expect(toNumberInputValue(0)).toBe(0);
  });

  it("falls back when the input is empty", () => {
    expect(toNumberInputValue(domChangeEvent(""))).toBe(0);
    expect(toNumberInputValue("")).toBe(0);
  });

  it("falls back when the value cannot be parsed", () => {
    expect(toNumberInputValue(domChangeEvent("abc"))).toBe(0);
    expect(toNumberInputValue(NaN)).toBe(0);
    expect(toNumberInputValue(null)).toBe(0);
    expect(toNumberInputValue(undefined)).toBe(0);
  });

  it("honours a custom fallback", () => {
    expect(toNumberInputValue(domChangeEvent(""), null)).toBeNull();
    expect(toNumberInputValue(NaN, null)).toBeNull();
    expect(toNumberInputValue(domChangeEvent(""), NaN)).toBeNaN();
    expect(toNumberInputValue(NaN, NaN)).toBeNaN();
  });
});

describe("isPriceStepAligned", () => {
  it("returns false when the price is not a multiple of the price step", () => {
    expect(isPriceStepAligned(0.25, 0.1)).toBe(false);
  });

  it("returns true when the price is a multiple of the price step", () => {
    expect(isPriceStepAligned(0.2, 0.1)).toBe(true);
    expect(isPriceStepAligned(0.3, 0.1)).toBe(true);
    expect(isPriceStepAligned(12.5, 0.5)).toBe(true);
  });

  it("returns true when the price step is the default cent granularity", () => {
    expect(isPriceStepAligned(12.5, 0.01)).toBe(true);
  });

  it("returns true when the price is not a finite number yet", () => {
    expect(isPriceStepAligned(NaN, 0.1)).toBe(true);
  });

  it("returns true when the price step is not finite or not positive", () => {
    expect(isPriceStepAligned(0.25, 0)).toBe(true);
    expect(isPriceStepAligned(0.25, NaN)).toBe(true);
  });
});
