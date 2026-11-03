import {
  addDays,
  formatDayOfMonthLabel,
  formatReadableDate,
  formatWeekdayLabel,
  formatWeekRangeLabel,
  getWeekDays,
  getWeekStart,
  parseIsoDate,
  toIsoDate,
} from "../week";

describe("week utils", () => {
  it("starts the week on monday", () => {
    expect(toIsoDate(getWeekStart(new Date(2026, 9, 1)))).toBe("2026-09-28");
    expect(toIsoDate(getWeekStart(new Date(2026, 9, 4)))).toBe("2026-09-28");
    expect(toIsoDate(getWeekStart(new Date(2026, 8, 28)))).toBe("2026-09-28");
  });

  it("returns the seven days of the week", () => {
    const weekDays = getWeekDays(new Date(2026, 8, 28));

    expect(weekDays.map(toIsoDate)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });

  it("formats dates in local time instead of UTC", () => {
    expect(toIsoDate(new Date(2026, 0, 1, 23, 59))).toBe("2026-01-01");
  });

  it("parses iso dates as local dates", () => {
    const parsedDate = parseIsoDate("2026-03-09");

    expect(parsedDate.getFullYear()).toBe(2026);
    expect(parsedDate.getMonth()).toBe(2);
    expect(parsedDate.getDate()).toBe(9);
  });

  it("adds days without mutating the original date", () => {
    const originalDate = new Date(2026, 9, 1);

    expect(toIsoDate(addDays(originalDate, -7))).toBe("2026-09-24");
    expect(toIsoDate(originalDate)).toBe("2026-10-01");
  });
});

describe("date labels", () => {
  const friday = new Date(2026, 9, 2);

  it("formats the short weekday and day of month in the active locale", () => {
    expect(formatWeekdayLabel(friday, "en")).toBe("Fri");
    expect(formatDayOfMonthLabel(friday, "en")).toBe("Oct 2");
    expect(formatWeekdayLabel(friday, "es")).toBe("vie");
  });

  it("formats the week range in the active locale", () => {
    expect(formatWeekRangeLabel(new Date(2026, 8, 28), new Date(2026, 9, 4), "en")).toMatch(/Sep 28.+Oct 4, 2026/);
  });

  it("formats a readable date from an iso date without shifting the day", () => {
    expect(formatReadableDate("2026-10-02", "en")).toBe("Friday, October 2, 2026");
  });
});
