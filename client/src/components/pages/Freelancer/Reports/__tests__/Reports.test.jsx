import { fireEvent, render, screen } from "@testing-library/react";

import { printHtmlDocument } from "@/utils/printHtmlDocument";

import { useFreelanceReport, useReportSatsTotal } from "../../hooks";
import { Reports } from "../Reports";
import { downloadFreelanceReportCsv } from "../utils/reportCsv";

import { freelanceReportFixture } from "./utils/freelanceReportFixture";

jest.mock("@/utils/printHtmlDocument", () => ({
  printHtmlDocument: jest.fn(),
}));

jest.mock("../utils/reportCsv", () => ({
  ...jest.requireActual("../utils/reportCsv"),
  downloadFreelanceReportCsv: jest.fn(),
}));

jest.mock("../../hooks", () => ({
  useFreelanceReport: jest.fn(),
  useReportSatsTotal: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey, translationValues) => (
    translationValues?.currency ? `${translationKey} ${translationValues.currency}` : translationKey
  ),
}));

jest.mock("@providers/configurations/configurationsProvider", () => ({
  useConfigurations: () => ({ config: { businessName: "Alice Studio" } }),
}));

jest.mock("@/components/shared/PageHeader", () => ({
  PageHeader: ({ title, actions }) => (
    <header>
      <h1>{title}</h1>
      {actions}
    </header>
  ),
}));

jest.mock("@/components/shared/PermissionBlockedMessage", () => ({
  PermissionBlockedMessage: ({ title }) => <p>{title}</p>,
}));

jest.mock("../../../Store/Reports/Filters", () => ({
  PeriodFilter: () => <div>period-filter</div>,
}));

jest.mock("../ReportProjectsFilters", () => ({
  ReportProjectsFilters: ({ projects, onReportFiltersChange }) => (
    <div>
      {projects.map((project) => (
        <button key={project.id} type="button" onClick={() => onReportFiltersChange({ projectId: project.id })}>
          {`filter-${project.name}`}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("../Charts", () => ({
  ReportAnalyticsCard: ({ report }) => <div>{`report-analytics-${report.currencies.length}`}</div>,
}));

jest.mock("../../../Store/Reports/Summary", () => ({
  ReportSkeleton: () => <div>report-skeleton</div>,
  SummaryCard: ({ stats }) => (
    <ul>
      {stats.map(({ label, value }) => <li key={label}>{`${label}: ${value}`}</li>)}
    </ul>
  ),
}));

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ children, isDisabled, onPress }) => (
    <button type="button" disabled={isDisabled} onClick={onPress}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Spinner: () => <div>spinner</div>,
  Table: ({ children }) => <table>{children}</table>,
  TableHeader: ({ children }) => <thead><tr>{children}</tr></thead>,
  TableColumn: ({ children }) => <th>{children}</th>,
  TableBody: ({ children }) => <tbody>{children}</tbody>,
  TableRow: ({ children }) => <tr>{children}</tr>,
  TableCell: ({ children }) => <td>{children}</td>,
}));

const fetchReport = jest.fn();

function mockReportState(reportState) {
  useFreelanceReport.mockReturnValue({
    report: freelanceReportFixture,
    loading: false,
    error: null,
    forbidden: false,
    fetchReport,
    ...reportState,
  });
}

describe("Freelancer Reports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReportState();
    useReportSatsTotal.mockReturnValue({ totalSatoshis: 350000, loading: false, unavailable: false });
  });

  it("loads the current month report on mount", () => {
    render(<Reports />);

    expect(fetchReport).toHaveBeenCalledWith({ period: "month" });
  });

  it("shows every currency total, the sats total and the project rows", () => {
    render(<Reports />);

    expect(screen.getByText("summary.currencyTotal EUR: EUR 50.00")).toBeInTheDocument();
    expect(screen.getByText("summary.currencyTotal USD: USD 250.00")).toBeInTheDocument();
    expect(screen.getByText(`summary.totalSatoshis: ${(350000).toLocaleString()} sats`)).toBeInTheDocument();
    expect(screen.getAllByText("Alice Website").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Development").length).toBeGreaterThan(0);
    expect(screen.getByText("report-analytics-2")).toBeInTheDocument();
  });

  it("exports the report to pdf through the shared print mechanism", () => {
    render(<Reports />);

    fireEvent.click(screen.getByRole("button", { name: "exportPdf" }));

    expect(printHtmlDocument).toHaveBeenCalledWith(expect.objectContaining({
      title: "document.reportTitle",
      htmlContent: expect.stringContaining("Alice Website"),
    }));
  });

  it("exports the report rows to csv", () => {
    render(<Reports />);

    fireEvent.click(screen.getByRole("button", { name: "exportCsv" }));

    expect(downloadFreelanceReportCsv).toHaveBeenCalledWith(
      expect.stringContaining('"Alice Website","Development","Alice","1h 30m","USD 150.00"'),
      freelanceReportFixture,
    );
  });

  it("disables the exports while the sats total is calculating", () => {
    useReportSatsTotal.mockReturnValue({ totalSatoshis: null, loading: true, unavailable: false });

    render(<Reports />);

    expect(screen.getByRole("button", { name: "exportPdf" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "exportCsv" })).toBeDisabled();
  });

  it("shows the empty state and disables the exports without billable time", () => {
    mockReportState({ report: { ...freelanceReportFixture, currencies: [] } });

    render(<Reports />);

    expect(screen.getByText("emptyState")).toBeInTheDocument();
    expect(screen.queryByText(/report-analytics/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "exportPdf" })).toBeDisabled();
  });

  it("shows the loading skeleton only before the first report arrives", () => {
    mockReportState({ report: null, loading: true });

    render(<Reports />);

    expect(screen.getByText("report-skeleton")).toBeInTheDocument();
  });

  it("offers the projects of the report as filter options", () => {
    render(<Reports />);

    expect(screen.getByRole("button", { name: "filter-Alice Website" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "filter-Bob App" })).toBeInTheDocument();
  });

  it("filters only the rows and the exports while the totals and charts keep the whole period", () => {
    render(<Reports />);

    fireEvent.click(screen.getByRole("button", { name: "filter-Alice Website" }));

    expect(screen.getByText("summary.currencyTotal EUR: EUR 50.00")).toBeInTheDocument();
    expect(screen.getByText("summary.currencyTotal USD: USD 250.00")).toBeInTheDocument();
    expect(screen.getByText("report-analytics-2")).toBeInTheDocument();
    expect(screen.queryAllByText("Bob App")).toHaveLength(0);
    expect(useReportSatsTotal).toHaveBeenCalledWith(freelanceReportFixture.currencies);
    expect(useReportSatsTotal).toHaveBeenLastCalledWith([expect.objectContaining({ currencyAcronym: "USD" })]);

    fireEvent.click(screen.getByRole("button", { name: "exportCsv" }));

    const [exportedCsvContent, exportedReport] = downloadFreelanceReportCsv.mock.calls[0];
    expect(exportedCsvContent).not.toContain("Bob App");
    expect(exportedCsvContent).not.toContain("EUR 50.00");
    expect(exportedReport.currencies).toEqual([expect.objectContaining({ currencyAcronym: "USD" })]);
  });

  it("exports the pdf with the charts of the filtered projects only", () => {
    render(<Reports />);

    fireEvent.click(screen.getByRole("button", { name: "filter-Alice Website" }));
    fireEvent.click(screen.getByRole("button", { name: "exportPdf" }));

    const [{ htmlContent }] = printHtmlDocument.mock.calls[0];
    expect(htmlContent).toContain("charts.durationByProject");
    expect(htmlContent).toContain("Alice Website");
    expect(htmlContent).not.toContain("Bob App");
  });

  it("shows the permission message when the report is forbidden", () => {
    mockReportState({ report: null, forbidden: true });

    render(<Reports />);

    expect(screen.getByText("permissionBlocked.title")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "exportPdf" })).not.toBeInTheDocument();
  });
});
