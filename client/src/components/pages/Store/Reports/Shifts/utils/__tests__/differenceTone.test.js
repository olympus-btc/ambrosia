import { differenceBarColor, differenceTextClass } from "../differenceTone";

describe("differenceTextClass", () => {
  it("returns a neutral class when difference is null", () => {
    expect(differenceTextClass(null)).toBe("text-gray-400");
  });

  it("returns red when the shift is short (negative difference)", () => {
    expect(differenceTextClass(-10)).toBe("text-red-600");
  });

  it("returns orange when the shift is over (positive difference)", () => {
    expect(differenceTextClass(10)).toBe("text-orange-500");
  });

  it("returns green when the shift matches exactly (zero difference)", () => {
    expect(differenceTextClass(0)).toBe("text-green-600");
  });
});

describe("differenceBarColor", () => {
  it("returns red for a negative difference", () => {
    expect(differenceBarColor(-10)).toBe("#dc2626");
  });

  it("returns orange for a positive difference", () => {
    expect(differenceBarColor(10)).toBe("#f97316");
  });

  it("returns green for zero difference", () => {
    expect(differenceBarColor(0)).toBe("#16a34a");
  });
});
