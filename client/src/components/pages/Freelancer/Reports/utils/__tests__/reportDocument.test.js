import { freelanceReportFixture, summaryTranslationsFixture } from "../../__tests__/utils/freelanceReportFixture";
import { buildFreelanceReportHtmlDocument } from "../reportDocument";
import { buildReportProjectGroups, buildReportSummaryStats, flattenReportProjectGroups } from "../reportRows";

const documentTranslations = {
  reportTitle: "Billing report",
  businessFallbackName: "Business",
  period: "Period",
  projects: "Projects",
  projectTask: "Project / Task",
  duration: "Duration",
  amount: "Amount",
  noProjects: "No billable time in this period.",
  charts: {
    durationByProject: "Time by project",
    durationByClient: "Time by client",
    durationByTask: "Time by task",
  },
};

const businessConfig = {
  businessName: "Alice Studio",
  businessEmail: "alice@example.com",
};

const summaryStats = buildReportSummaryStats(
  freelanceReportFixture,
  { totalSatoshis: 350000, loading: false, unavailable: false },
  summaryTranslationsFixture,
);

function buildDocument(projectRows) {
  return buildFreelanceReportHtmlDocument({
    report: freelanceReportFixture,
    projectRows,
    summaryStats,
    businessConfig,
    documentTranslations,
  });
}

describe("buildFreelanceReportHtmlDocument", () => {
  it("renders the issuer letterhead, every summary figure and every row", () => {
    const reportHtmlDocument = buildDocument(
      flattenReportProjectGroups(buildReportProjectGroups(freelanceReportFixture)),
    );

    expect(reportHtmlDocument).toContain("Alice Studio");
    expect(reportHtmlDocument).toContain("alice@example.com");
    expect(reportHtmlDocument).toContain("Billing report");
    summaryStats.forEach(({ label, value }) => {
      expect(reportHtmlDocument).toContain(label);
      expect(reportHtmlDocument).toContain(value);
    });
    ["Bob App", "Review", "Alice Website", "Design", "Development", "USD 150.00", "1h 30m"].forEach((rowValue) => {
      expect(reportHtmlDocument).toContain(rowValue);
    });
  });

  it("includes the time charts of the exported report", () => {
    const reportHtmlDocument = buildDocument(
      flattenReportProjectGroups(buildReportProjectGroups(freelanceReportFixture)),
    );

    expect(reportHtmlDocument).toContain("Time by project");
    expect(reportHtmlDocument).toContain("Time by client");
    expect(reportHtmlDocument).toContain("Time by task");
    expect(reportHtmlDocument).toContain("print-color-adjust:exact");
  });

  it("leaves the charts out when the report has no projects", () => {
    const reportHtmlDocument = buildFreelanceReportHtmlDocument({
      report: { ...freelanceReportFixture, currencies: [] },
      projectRows: [],
      summaryStats,
      businessConfig,
      documentTranslations,
    });

    expect(reportHtmlDocument).not.toContain("Time by project");
  });

  it("shows the empty state without rows", () => {
    expect(buildDocument([])).toContain("No billable time in this period.");
  });

  it("escapes user provided values", () => {
    const reportHtmlDocument = buildDocument([{
      rowKey: "row-mallory",
      rowType: "project",
      projectName: "<script>alert(1)</script>",
      taskName: "",
      clientName: "Mallory",
      duration: "1h",
      amount: "USD 1.00",
    }]);

    expect(reportHtmlDocument).not.toContain("<script>alert(1)</script>");
    expect(reportHtmlDocument).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
