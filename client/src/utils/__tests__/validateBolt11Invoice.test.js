import { BOLT11_VALIDATION_ERROR, getBolt11ValidationErrorCode } from "../validateBolt11Invoice";

describe("getBolt11ValidationErrorCode", () => {
  it("returns EMPTY for an empty string", () => {
    expect(getBolt11ValidationErrorCode("")).toBe(BOLT11_VALIDATION_ERROR.EMPTY);
  });

  it("returns EMPTY for whitespace-only input", () => {
    expect(getBolt11ValidationErrorCode("   ")).toBe(BOLT11_VALIDATION_ERROR.EMPTY);
  });

  it("returns INVALID_FORMAT for an invalid prefix", () => {
    expect(getBolt11ValidationErrorCode("invalid1000n1pj9h8uqpp5test")).toBe(
      BOLT11_VALIDATION_ERROR.INVALID_FORMAT,
    );
  });

  it("returns INVALID_FORMAT for a valid prefix shorter than 20 characters", () => {
    expect(getBolt11ValidationErrorCode("lnbc123")).toBe(BOLT11_VALIDATION_ERROR.INVALID_FORMAT);
  });

  it("accepts a valid mainnet invoice", () => {
    expect(getBolt11ValidationErrorCode("lnbc1000n1pj9h8uqpp5test")).toBe("");
  });

  it("accepts a valid testnet invoice", () => {
    expect(getBolt11ValidationErrorCode("lntb1000n1pj9h8uqpp5test")).toBe("");
  });

  it("accepts a valid regtest invoice", () => {
    expect(getBolt11ValidationErrorCode("lnbcrt1000n1pj9h8uqpp5test")).toBe("");
  });

  it("is case-insensitive", () => {
    expect(getBolt11ValidationErrorCode("LNBC1000N1PJ9H8UQPP5TEST")).toBe("");
  });
});
