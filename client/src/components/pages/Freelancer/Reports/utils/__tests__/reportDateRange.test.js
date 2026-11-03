import { resolveReportDateRange } from "../reportDateRange";

const thursdayOctoberTwentyThird = new Date(2026, 9, 23);

describe("resolveReportDateRange", () => {
  it.each([
    ["day", "2026-10-23"],
    ["week", "2026-10-19"],
    ["month", "2026-10-01"],
    ["year", "2026-01-01"],
  ])("starts the %s period on %s and ends it today", (period, expectedFrom) => {
    expect(resolveReportDateRange({ period }, thursdayOctoberTwentyThird)).toEqual({
      from: expectedFrom,
      to: "2026-10-23",
    });
  });

  it("starts the week on monday when today is sunday", () => {
    const sundayOctoberTwentyFifth = new Date(2026, 9, 25);

    expect(resolveReportDateRange({ period: "week" }, sundayOctoberTwentyFifth).from).toBe("2026-10-19");
  });

  it("uses the custom date range as is", () => {
    expect(resolveReportDateRange({ startDate: "2026-08-17", endDate: "2026-08-23" })).toEqual({
      from: "2026-08-17",
      to: "2026-08-23",
    });
  });

  it("returns null when the query has no period or complete range", () => {
    expect(resolveReportDateRange({ startDate: "2026-08-17" })).toBeNull();
    expect(resolveReportDateRange(null)).toBeNull();
  });
});
