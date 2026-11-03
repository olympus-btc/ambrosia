import { buildTimeEntryPayload } from "../buildTimeEntryPayload";

describe("buildTimeEntryPayload", () => {
  it("builds the full payload expected by the time entries API", () => {
    expect(buildTimeEntryPayload({
      projectId: "project-id",
      taskId: "task-id",
      taskName: "Development",
      entryDate: "2026-10-01",
      description: "  Landing page  ",
      durationMinutes: 90,
    })).toEqual({
      projectId: "project-id",
      taskId: "task-id",
      taskName: null,
      entryDate: "2026-10-01",
      description: "Landing page",
      durationMinutes: 90,
      startTime: null,
      endTime: null,
    });
  });

  it("sends the trimmed task name when the task does not exist yet", () => {
    const timeEntryPayload = buildTimeEntryPayload({ taskId: "", taskName: "  Code review ", durationMinutes: 15 });

    expect(timeEntryPayload.taskId).toBeNull();
    expect(timeEntryPayload.taskName).toBe("Code review");
  });

  it("sends a null description when it is blank", () => {
    expect(buildTimeEntryPayload({ description: "   ", durationMinutes: 15 }).description).toBeNull();
  });

  it("always sends a duration that is a multiple of fifteen minutes", () => {
    expect(buildTimeEntryPayload({ durationMinutes: 52 }).durationMinutes).toBe(45);
  });
});
