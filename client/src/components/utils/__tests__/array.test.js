import { toArray } from "../array";

describe("toArray", () => {
  it("returns the value when it is already an array", () => {
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("returns empty array fallback when value is not an array", () => {
    expect(toArray(null)).toEqual([]);
    expect(toArray(undefined)).toEqual([]);
    expect(toArray("string")).toEqual([]);
    expect(toArray(42)).toEqual([]);
    expect(toArray({})).toEqual([]);
  });

  it("returns custom fallback when value is not an array", () => {
    expect(toArray(null, ["default"])).toEqual(["default"]);
    expect(toArray(undefined, [0])).toEqual([0]);
  });

  it("returns empty array when value is an empty array", () => {
    expect(toArray([])).toEqual([]);
  });
});
