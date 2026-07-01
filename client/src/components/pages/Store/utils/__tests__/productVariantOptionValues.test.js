import {
  deriveVariantDisplayName,
  findMatchingVariant,
  variantHasOptionValues,
} from "../productVariantOptionValues";

const options = [
  {
    id: "type-color",
    values: [
      { id: "val-red", value: "Red" },
      { id: "val-blue", value: "Blue" },
    ],
  },
  {
    id: "type-size",
    values: [
      { id: "val-s", value: "S" },
      { id: "val-l", value: "L" },
    ],
  },
];

describe("deriveVariantDisplayName", () => {
  it("returns null when options is empty", () => {
    expect(deriveVariantDisplayName(["val-red"], [])).toBeNull();
  });

  it("returns null when optionValueIds is empty", () => {
    expect(deriveVariantDisplayName([], options)).toBeNull();
  });

  it("returns null when optionValueIds is undefined", () => {
    expect(deriveVariantDisplayName(undefined, options)).toBeNull();
  });

  it("returns null when options is undefined", () => {
    expect(deriveVariantDisplayName(["val-red"], undefined)).toBeNull();
  });

  it("returns joined labels for known ids", () => {
    expect(deriveVariantDisplayName(["val-red", "val-s"], options)).toBe("Red / S");
  });

  it("returns single label when only one id matches", () => {
    expect(deriveVariantDisplayName(["val-blue"], options)).toBe("Blue");
  });

  it("filters out unknown ids and returns remaining labels", () => {
    expect(deriveVariantDisplayName(["val-red", "unknown-id"], options)).toBe("Red");
  });

  it("returns null when all ids are unknown", () => {
    expect(deriveVariantDisplayName(["unknown-1", "unknown-2"], options)).toBeNull();
  });
});

describe("findMatchingVariant", () => {
  const variants = [
    { id: "v1", optionValueIds: ["val-red", "val-s"] },
    { id: "v2", optionValueIds: ["val-red", "val-l"] },
    { id: "v3", optionValueIds: ["val-blue", "val-s"] },
  ];

  it("returns null when variants is empty", () => {
    expect(findMatchingVariant([], ["val-red", "val-s"])).toBeNull();
  });

  it("returns null when selectedOptionValueIds is empty", () => {
    expect(findMatchingVariant(variants, [])).toBeNull();
  });

  it("returns null when selectedOptionValueIds is undefined", () => {
    expect(findMatchingVariant(variants, undefined)).toBeNull();
  });

  it("returns null when variants is undefined", () => {
    expect(findMatchingVariant(undefined, ["val-red"])).toBeNull();
  });

  it("returns the matching variant", () => {
    expect(findMatchingVariant(variants, ["val-red", "val-s"])).toBe(variants[0]);
  });

  it("ignores inactive matching variants", () => {
    const variantsWithInactiveMatch = [
      { id: "inactive", isActive: false, optionValueIds: ["val-red", "val-s"] },
      { id: "active", isActive: true, optionValueIds: ["val-red", "val-s"] },
    ];
    expect(findMatchingVariant(variantsWithInactiveMatch, ["val-red", "val-s"])).toBe(variantsWithInactiveMatch[1]);
  });

  it("returns null when only an inactive variant matches", () => {
    const variantsWithInactiveMatch = [
      { id: "inactive", isActive: false, optionValueIds: ["val-red", "val-s"] },
    ];
    expect(findMatchingVariant(variantsWithInactiveMatch, ["val-red", "val-s"])).toBeNull();
  });

  it("matches regardless of selection order", () => {
    expect(findMatchingVariant(variants, ["val-s", "val-red"])).toBe(variants[0]);
  });

  it("returns null when no variant matches the selection", () => {
    expect(findMatchingVariant(variants, ["val-blue", "val-l"])).toBeNull();
  });

  it("returns null when selection count differs from variant option count", () => {
    expect(findMatchingVariant(variants, ["val-red"])).toBeNull();
  });

  it("handles variant with empty optionValueIds", () => {
    const variantWithoutOptionValues = [{ id: "v-empty", optionValueIds: [] }];
    expect(findMatchingVariant(variantWithoutOptionValues, ["val-red"])).toBeNull();
  });

  it("handles variant with null optionValueIds", () => {
    const variantWithoutOptionValues = [{ id: "v-null", optionValueIds: null }];
    expect(findMatchingVariant(variantWithoutOptionValues, ["val-red"])).toBeNull();
  });
});

describe("variantHasOptionValues", () => {
  it("returns true when variant includes every selected option value", () => {
    const variant = { id: "v1", optionValueIds: ["val-red", "val-s"] };

    expect(variantHasOptionValues(variant, ["val-red"])).toBe(true);
  });

  it("returns false when variant misses a selected option value", () => {
    const variant = { id: "v1", optionValueIds: ["val-red", "val-s"] };

    expect(variantHasOptionValues(variant, ["val-blue"])).toBe(false);
  });
});
