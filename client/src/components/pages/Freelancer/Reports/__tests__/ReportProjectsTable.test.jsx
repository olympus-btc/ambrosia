import { render, screen } from "@testing-library/react";

import { ReportProjectsTable } from "../ReportProjectsTable";
import { buildReportProjectGroups, flattenReportProjectGroups } from "../utils/reportRows";

import { freelanceReportFixture } from "./utils/freelanceReportFixture";

jest.mock("next-intl", () => ({ useTranslations: () => (translationKey) => translationKey }));

const projectRows = flattenReportProjectGroups(buildReportProjectGroups(freelanceReportFixture));

describe("ReportProjectsTable", () => {
  it("highlights the project rows to separate each project from its tasks", () => {
    render(<ReportProjectsTable projectRows={projectRows} />);

    expect(screen.getByText("Alice Website").closest("tr")).toHaveClass("bg-green-50");
    expect(screen.getByText("Bob App").closest("tr")).toHaveClass("bg-green-50");
    expect(screen.getByText("Development").closest("tr")).not.toHaveClass("bg-green-50");
  });
});
