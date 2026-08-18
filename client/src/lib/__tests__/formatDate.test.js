import formatDate, { formatDateParts, parseDateValue } from "../formatDate";

const SAMPLE_NAIVE_DATETIME = "2024-06-15T20:00:00";

describe("parseDateValue", () => {
  it("parses a naive datetime string as local time, not UTC", () => {
    const parsed = parseDateValue(SAMPLE_NAIVE_DATETIME);
    const expectedLocal = new Date(2024, 5, 15, 20, 0, 0);

    expect(parsed.getTime()).toBe(expectedLocal.getTime());
  });

  it("parses a numeric epoch-milliseconds string as an absolute instant", () => {
    const parsed = parseDateValue("1718481600000");

    expect(parsed.getTime()).toBe(1718481600000);
  });

  it("parses a Z-suffixed string as an absolute instant, unaffected by local time", () => {
    const parsed = parseDateValue("2024-06-15T20:00:00Z");

    expect(parsed.getTime()).toBe(Date.UTC(2024, 5, 15, 20, 0, 0));
  });

  it("parses an offset-suffixed string as an absolute instant, unaffected by local time", () => {
    const parsed = parseDateValue("2024-06-15T20:00:00+05:00");

    expect(parsed.getTime()).toBe(Date.UTC(2024, 5, 15, 15, 0, 0));
  });

  it("returns an invalid date for an empty or null value", () => {
    expect(isNaN(parseDateValue("").getTime())).toBe(true);
    expect(isNaN(parseDateValue(null).getTime())).toBe(true);
    expect(isNaN(parseDateValue(undefined).getTime())).toBe(true);
  });
});

describe("formatDate", () => {
  it("returns an em dash for an empty or invalid value", () => {
    expect(formatDate("")).toBe("—");
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("returns a formatted string for a valid naive datetime string", () => {
    const formatted = formatDate(SAMPLE_NAIVE_DATETIME);

    expect(formatted).not.toBe("—");
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe("formatDateParts", () => {
  it("returns the empty-state shape for an empty or invalid value", () => {
    expect(formatDateParts("")).toEqual({ localDay: "", date: "-", time: "" });
    expect(formatDateParts("not-a-date")).toEqual({ localDay: "", date: "-", time: "" });
  });

  it("computes localDay from the local date, not the UTC date, of a naive datetime string", () => {
    const parts = formatDateParts("2024-06-15T23:30:00");

    expect(parts.localDay).toBe("2024-06-15");
  });

  it("returns non-empty date and time for a valid naive datetime string", () => {
    const parts = formatDateParts(SAMPLE_NAIVE_DATETIME);

    expect(parts.date.length).toBeGreaterThan(0);
    expect(parts.time.length).toBeGreaterThan(0);
  });
});
