import { freelanceReportFixture } from "../../__tests__/utils/freelanceReportFixture";
import { buildReportFilterOptions, filterReport } from "../reportFilters";

describe("buildReportFilterOptions", () => {
  it("lists the unique clients and projects of the report sorted by name", () => {
    expect(buildReportFilterOptions(freelanceReportFixture)).toEqual({
      clients: [{ id: "client-alice", name: "Alice" }, { id: "client-bob", name: "Bob" }],
      projects: [
        { id: "project-alice", name: "Alice Website", clientId: "client-alice" },
        { id: "project-bob", name: "Bob App", clientId: "client-bob" },
      ],
    });
  });

  it("returns empty options without a report", () => {
    expect(buildReportFilterOptions(null)).toEqual({ clients: [], projects: [] });
  });
});

describe("filterReport", () => {
  it("returns the same report when no filter is selected", () => {
    expect(filterReport(freelanceReportFixture, { search: "", clientId: "", projectId: "" })).toBe(freelanceReportFixture);
  });

  it("keeps only the selected project and drops the currencies left empty", () => {
    const filteredReport = filterReport(freelanceReportFixture, { search: "", clientId: "", projectId: "project-bob" });

    expect(filteredReport.currencies).toHaveLength(1);
    expect(filteredReport.currencies[0]).toMatchObject({ currencyAcronym: "EUR", totalDurationMinutes: 60, totalAmountCents: 5000 });
  });

  it("recalculates the currency totals from the projects of the selected client", () => {
    const reportWithTwoUsdProjects = {
      ...freelanceReportFixture,
      currencies: [{
        ...freelanceReportFixture.currencies[1],
        totalDurationMinutes: 180,
        totalAmountCents: 30000,
        projects: [
          ...freelanceReportFixture.currencies[1].projects,
          { projectId: "project-carol", projectName: "Carol Shop", clientId: "client-carol", clientName: "Carol", durationMinutes: 30, amountCents: 5000, tasks: [] },
        ],
      }],
    };

    const filteredReport = filterReport(reportWithTwoUsdProjects, { search: "", clientId: "client-alice", projectId: "" });

    expect(filteredReport.currencies[0]).toMatchObject({ totalDurationMinutes: 150, totalAmountCents: 25000 });
    expect(filteredReport.currencies[0].projects).toHaveLength(1);
  });

  it("keeps the whole project when the search matches the project or the client", () => {
    const filteredReport = filterReport(freelanceReportFixture, { search: " ALICE ", clientId: "", projectId: "" });

    expect(filteredReport.currencies).toHaveLength(1);
    expect(filteredReport.currencies[0].projects[0].tasks).toHaveLength(2);
    expect(filteredReport.currencies[0].totalAmountCents).toBe(25000);
  });

  it("keeps only the matching tasks and recalculates the totals when the search matches a task", () => {
    const filteredReport = filterReport(freelanceReportFixture, { search: "design", clientId: "", projectId: "" });

    expect(filteredReport.currencies).toHaveLength(1);
    expect(filteredReport.currencies[0].projects[0]).toMatchObject({ durationMinutes: 60, amountCents: 10000 });
    expect(filteredReport.currencies[0].projects[0].tasks).toEqual([expect.objectContaining({ taskName: "Design" })]);
    expect(filteredReport.currencies[0]).toMatchObject({ totalDurationMinutes: 60, totalAmountCents: 10000 });
  });

  it("returns no currencies when nothing matches the search", () => {
    expect(filterReport(freelanceReportFixture, { search: "nothing", clientId: "", projectId: "" }).currencies).toEqual([]);
  });
});
