import { freelanceReportFixture, summaryTranslationsFixture } from "../../__tests__/utils/freelanceReportFixture";
import {
  buildReportProjectGroups,
  buildReportSummaryStats,
  flattenReportProjectGroups,
  REPORT_ROW_TYPES,
} from "../reportRows";

describe("buildReportProjectGroups", () => {
  it("builds a project row with its task rows for every currency", () => {
    const [bobGroup, aliceGroup] = buildReportProjectGroups(freelanceReportFixture);

    expect(bobGroup.projectRow).toEqual(expect.objectContaining({
      rowType: REPORT_ROW_TYPES.project,
      projectName: "Bob App",
      clientName: "Bob",
      duration: "1h",
      amount: "EUR 50.00",
    }));
    expect(aliceGroup.taskRows).toEqual([
      expect.objectContaining({ rowType: REPORT_ROW_TYPES.task, taskName: "Design", duration: "1h", amount: "USD 100.00" }),
      expect.objectContaining({ rowType: REPORT_ROW_TYPES.task, taskName: "Development", duration: "1h 30m", amount: "USD 150.00" }),
    ]);
  });

  it("returns no groups without a report", () => {
    expect(buildReportProjectGroups(null)).toEqual([]);
  });
});

describe("flattenReportProjectGroups", () => {
  it("places every project row before its task rows", () => {
    const projectRows = flattenReportProjectGroups(buildReportProjectGroups(freelanceReportFixture));

    expect(projectRows.map(({ projectName, taskName }) => [projectName, taskName])).toEqual([
      ["Bob App", ""],
      ["Bob App", "Review"],
      ["Alice Website", ""],
      ["Alice Website", "Design"],
      ["Alice Website", "Development"],
    ]);
  });
});

describe("buildReportSummaryStats", () => {
  const calculatedSatsTotal = { totalSatoshis: 350000, loading: false, unavailable: false };

  it("lists each currency total, the total time and the sats total", () => {
    expect(buildReportSummaryStats(freelanceReportFixture, calculatedSatsTotal, summaryTranslationsFixture)).toEqual([
      { label: "Total EUR", value: "EUR 50.00" },
      { label: "Total USD", value: "USD 250.00" },
      { label: "Total time", value: "3h 30m" },
      { label: "Total in sats", value: `${(350000).toLocaleString()} sats` },
    ]);
  });

  it.each([
    [{ totalSatoshis: null, loading: true, unavailable: false }, "Calculating"],
    [{ totalSatoshis: null, loading: false, unavailable: true }, "Not available"],
  ])("describes a sats total that is not ready", (satsTotal, expectedSatsValue) => {
    const summaryStats = buildReportSummaryStats(freelanceReportFixture, satsTotal, summaryTranslationsFixture);

    expect(summaryStats.at(-1)).toEqual({ label: "Total in sats", value: expectedSatsValue });
  });
});
