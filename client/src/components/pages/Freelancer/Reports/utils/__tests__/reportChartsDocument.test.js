import { buildReportChartsMarkup } from "../reportChartsDocument";

const chartTranslations = {
  durationByProject: "Time by project",
  durationByClient: "Time by client",
  durationByTask: "Time by task",
};

const chartData = {
  durationByProject: [{ name: "Alice Website", durationMinutes: 150 }, { name: "Bob App", durationMinutes: 75 }],
  durationByClient: [{ name: "Alice", durationMinutes: 150 }, { name: "Bob", durationMinutes: 75 }],
  durationByTask: [{ name: "Development", durationMinutes: 90 }, { name: "Review", durationMinutes: 30 }],
};

describe("buildReportChartsMarkup", () => {
  it("renders the three chart titles with their names and durations", () => {
    const chartsMarkup = buildReportChartsMarkup(chartData, chartTranslations);

    ["Time by project", "Time by client", "Time by task", "Alice Website", "Bob", "Development", "2h 30m", "1h 15m"].forEach((chartValue) => {
      expect(chartsMarkup).toContain(chartValue);
    });
  });

  it("sizes each bar relative to the longest duration", () => {
    const chartsMarkup = buildReportChartsMarkup(chartData, chartTranslations);

    expect(chartsMarkup).toContain("width:100%");
    expect(chartsMarkup).toContain("width:50%");
  });

  it("shows the share of each task in the donut legend", () => {
    const chartsMarkup = buildReportChartsMarkup(chartData, chartTranslations);

    expect(chartsMarkup).toContain("1h 30m · 75%");
    expect(chartsMarkup).toContain("30m · 25%");
    expect(chartsMarkup.match(/<circle /g)).toHaveLength(2);
  });

  it("renders nothing without chart data", () => {
    expect(buildReportChartsMarkup({ durationByProject: [], durationByClient: [], durationByTask: [] }, chartTranslations)).toBe("");
  });

  it("escapes user provided names", () => {
    const chartsMarkup = buildReportChartsMarkup({
      ...chartData,
      durationByTask: [{ name: "<script>alert(1)</script>", durationMinutes: 30 }],
    }, chartTranslations);

    expect(chartsMarkup).not.toContain("<script>");
    expect(chartsMarkup).toContain("&lt;script&gt;");
  });
});
