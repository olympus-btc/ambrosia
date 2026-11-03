import { formatPrintDate, formatPrintTime } from "../formatPrintDateTime";

const printedAt = new Date(2026, 0, 5, 0, 7);

describe("formatPrintDate", () => {
  it.each([
    ["DAY_MONTH_YEAR", "05/01/2026"],
    ["MONTH_DAY_YEAR", "01/05/2026"],
    ["YEAR_MONTH_DAY", "2026-01-05"],
  ])("formats the date as %s", (dateFormat, expectedDate) => {
    expect(formatPrintDate(printedAt, dateFormat)).toBe(expectedDate);
  });

  it("falls back to day/month/year for unknown formats", () => {
    expect(formatPrintDate(printedAt, "UNKNOWN")).toBe("05/01/2026");
  });
});

describe("formatPrintTime", () => {
  it.each([
    [new Date(2026, 0, 5, 0, 7), "HOURS_24", "00:07"],
    [new Date(2026, 0, 5, 13, 45), "HOURS_24", "13:45"],
    [new Date(2026, 0, 5, 0, 7), "HOURS_12", "12:07 AM"],
    [new Date(2026, 0, 5, 12, 0), "HOURS_12", "12:00 PM"],
    [new Date(2026, 0, 5, 13, 45), "HOURS_12", "1:45 PM"],
  ])("formats %s as %s", (time, timeFormat, expectedTime) => {
    expect(formatPrintTime(time, timeFormat)).toBe(expectedTime);
  });

  it("falls back to 24-hour time for unknown formats", () => {
    expect(formatPrintTime(new Date(2026, 0, 5, 13, 45), "UNKNOWN")).toBe("13:45");
  });
});
