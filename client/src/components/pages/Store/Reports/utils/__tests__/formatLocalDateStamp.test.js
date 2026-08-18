import { formatLocalDateStamp } from "../formatLocalDateStamp";

describe("formatLocalDateStamp", () => {
  it("formats a date using its local year, month, and day", () => {
    expect(formatLocalDateStamp(new Date(2026, 7, 13))).toBe("2026-08-13");
  });

  it("zero-pads single-digit month and day", () => {
    expect(formatLocalDateStamp(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("defaults to today's local date when no date is given", () => {
    expect(formatLocalDateStamp()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
