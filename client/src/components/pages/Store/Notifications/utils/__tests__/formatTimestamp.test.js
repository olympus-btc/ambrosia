import { formatTimestamp } from "../formatTimestamp";

describe("formatTimestamp", () => {
  it("returns an empty string when timestamp is missing", () => {
    expect(formatTimestamp(null)).toBe("");
    expect(formatTimestamp(undefined)).toBe("");
  });

  it("returns the original value when timestamp is invalid", () => {
    expect(formatTimestamp("not-a-date")).toBe("not-a-date");
  });

  it("formats valid timestamps", () => {
    const formattedTimestamp = formatTimestamp("2026-07-24T06:25:01.699301Z");

    expect(formattedTimestamp).toEqual(expect.any(String));
    expect(formattedTimestamp).not.toBe("");
    expect(formattedTimestamp).not.toBe("2026-07-24T06:25:01.699301Z");
  });
});
