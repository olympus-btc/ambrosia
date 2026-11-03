import { freelanceReportFixture } from "../../__tests__/utils/freelanceReportFixture";
import { buildReportChartData } from "../reportCharts";

describe("buildReportChartData", () => {
  it("adds up the duration by project, client and task sorted from the longest", () => {
    expect(buildReportChartData(freelanceReportFixture)).toEqual({
      durationByProject: [
        { name: "Alice Website", durationMinutes: 150 },
        { name: "Bob App", durationMinutes: 60 },
      ],
      durationByClient: [
        { name: "Alice", durationMinutes: 150 },
        { name: "Bob", durationMinutes: 60 },
      ],
      durationByTask: [
        { name: "Development", durationMinutes: 90 },
        { name: "Review", durationMinutes: 60 },
        { name: "Design", durationMinutes: 60 },
      ],
    });
  });

  it("merges the same task across projects", () => {
    const reportWithSharedTask = {
      currencies: [{
        projects: [
          { projectId: "project-one", projectName: "One", clientId: "client-one", clientName: "Client", durationMinutes: 30, tasks: [{ taskId: "task-shared", taskName: "Shared", durationMinutes: 30 }] },
          { projectId: "project-two", projectName: "Two", clientId: "client-one", clientName: "Client", durationMinutes: 45, tasks: [{ taskId: "task-shared", taskName: "Shared", durationMinutes: 45 }] },
        ],
      }],
    };

    const { durationByClient, durationByTask } = buildReportChartData(reportWithSharedTask);

    expect(durationByTask).toEqual([{ name: "Shared", durationMinutes: 75 }]);
    expect(durationByClient).toEqual([{ name: "Client", durationMinutes: 75 }]);
  });

  it("keeps at most eight items per chart", () => {
    const manyProjects = Array.from({ length: 10 }, (_, projectIndex) => ({
      projectId: `project-${projectIndex}`,
      projectName: `Project ${projectIndex}`,
      clientId: "client",
      clientName: "Client",
      durationMinutes: (projectIndex + 1) * 15,
      tasks: [],
    }));

    const { durationByProject } = buildReportChartData({ currencies: [{ projects: manyProjects }] });

    expect(durationByProject).toHaveLength(8);
    expect(durationByProject[0]).toEqual({ name: "Project 9", durationMinutes: 150 });
  });

  it("returns empty charts without a report", () => {
    expect(buildReportChartData(null)).toEqual({ durationByProject: [], durationByClient: [], durationByTask: [] });
  });
});
