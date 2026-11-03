import { downloadBlob } from "@/utils/downloadBlob";

import { freelanceReportFixture, summaryTranslationsFixture } from "../../__tests__/utils/freelanceReportFixture";
import { buildFreelanceReportCsv, downloadFreelanceReportCsv } from "../reportCsv";
import { buildReportProjectGroups, buildReportSummaryStats, flattenReportProjectGroups } from "../reportRows";

jest.mock("@/utils/downloadBlob", () => ({
  downloadBlob: jest.fn(),
}));

const csvTranslations = {
  project: "Project",
  task: "Task",
  client: "Client",
  duration: "Duration",
  amount: "Amount",
};

function buildFixtureCsv() {
  return buildFreelanceReportCsv({
    projectRows: flattenReportProjectGroups(buildReportProjectGroups(freelanceReportFixture)),
    summaryStats: buildReportSummaryStats(
      freelanceReportFixture,
      { totalSatoshis: 350000, loading: false, unavailable: false },
      summaryTranslationsFixture,
    ),
    csvTranslations,
  });
}

describe("buildFreelanceReportCsv", () => {
  it("writes the header, every project and task row and every summary figure", () => {
    expect(buildFixtureCsv().split("\n")).toEqual([
      '"Project","Task","Client","Duration","Amount"',
      '"Bob App","","Bob","1h","EUR 50.00"',
      '"Bob App","Review","Bob","1h","EUR 50.00"',
      '"Alice Website","","Alice","2h 30m","USD 250.00"',
      '"Alice Website","Design","Alice","1h","USD 100.00"',
      '"Alice Website","Development","Alice","1h 30m","USD 150.00"',
      "",
      '"Total EUR","EUR 50.00"',
      '"Total USD","USD 250.00"',
      '"Total time","3h 30m"',
      `"Total in sats","${(350000).toLocaleString()} sats"`,
    ]);
  });

  it("escapes quotes inside cells", () => {
    const csvContent = buildFreelanceReportCsv({
      projectRows: [{ projectName: 'Eve "Shop"', taskName: "", clientName: "Eve", duration: "1h", amount: "USD 1.00" }],
      summaryStats: [],
      csvTranslations,
    });

    expect(csvContent).toContain('"Eve ""Shop"""');
  });
});

describe("downloadFreelanceReportCsv", () => {
  it("downloads the csv named after the report period", () => {
    downloadFreelanceReportCsv("csv-content", freelanceReportFixture);

    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "freelance-report-2026-10-01-2026-10-31.csv");
  });
});
