import { addToast } from "@heroui/react";
import { act, renderHook, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useTimeEntries } from "../useTimeEntries";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

const WEEK_RANGE = { fromDate: "2026-09-28", toDate: "2026-10-04" };

const existingTimeEntry = {
  id: "time-entry-id",
  projectId: "project-id",
  taskId: "task-id",
  entryDate: "2026-09-30",
  description: "Landing page",
  durationMinutes: 60,
  startTime: null,
  endTime: null,
  isLocked: false,
};

const timeEntryForm = {
  projectId: "project-id",
  taskId: "task-id",
  entryDate: "2026-09-30",
  description: "Landing page",
  durationMinutes: 90,
};

function mockHttpResponses(httpResponses) {
  httpResponses.forEach(({ status = 200, body }) => {
    httpClient.mockResolvedValueOnce({ ok: status < 400, status, body });
  });
}

async function renderUseTimeEntries() {
  const renderedTimeEntriesHook = renderHook(() => useTimeEntries(WEEK_RANGE));
  await waitFor(() => expect(renderedTimeEntriesHook.result.current.loading).toBe(false));
  return renderedTimeEntriesHook;
}

describe("useTimeEntries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    parseJsonResponse.mockImplementation((httpResponse, fallbackValue) => Promise.resolve(httpResponse.body ?? fallbackValue));
  });

  it("loads the time entries of the requested week", async () => {
    mockHttpResponses([{ body: [existingTimeEntry] }]);

    const { result: timeEntriesHook } = await renderUseTimeEntries();

    expect(httpClient).toHaveBeenCalledWith(
      "/freelance/time-entries?from=2026-09-28&to=2026-10-04",
      { skipForbiddenRedirect: true },
    );
    expect(timeEntriesHook.current.timeEntries).toEqual([existingTimeEntry]);
  });

  it("sends the client and project filters to the API", async () => {
    mockHttpResponses([{ body: [existingTimeEntry] }]);

    const renderedTimeEntriesHook = renderHook(() => useTimeEntries({ ...WEEK_RANGE, clientId: "client-id", projectId: "project-id" }));
    await waitFor(() => expect(renderedTimeEntriesHook.result.current.loading).toBe(false));

    expect(httpClient).toHaveBeenCalledWith(
      "/freelance/time-entries?from=2026-09-28&to=2026-10-04&client_id=client-id&project_id=project-id",
      { skipForbiddenRedirect: true },
    );
  });

  it("marks the timesheet as forbidden on a 403 response", async () => {
    httpClient.mockResolvedValueOnce({ ok: false, status: 403 });

    const { result: timeEntriesHook } = await renderUseTimeEntries();

    expect(timeEntriesHook.current.forbidden).toBe(true);
    expect(timeEntriesHook.current.timeEntries).toEqual([]);
  });

  it("creates a time entry with a POST and reloads the week", async () => {
    mockHttpResponses([{ body: [] }, { status: 201, body: existingTimeEntry }, { body: [existingTimeEntry] }]);
    const { result: timeEntriesHook } = await renderUseTimeEntries();

    await act(async () => {
      await timeEntriesHook.current.createTimeEntry(timeEntryForm);
    });

    expect(httpClient).toHaveBeenNthCalledWith(2, "/freelance/time-entries", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(httpClient.mock.calls[1][1].body)).toEqual({
      ...timeEntryForm,
      taskName: null,
      startTime: null,
      endTime: null,
    });
    expect(timeEntriesHook.current.timeEntries).toEqual([existingTimeEntry]);
  });

  it("updates a time entry with a full PUT body", async () => {
    const updatedTimeEntry = { ...existingTimeEntry, durationMinutes: 90 };
    mockHttpResponses([{ body: [existingTimeEntry] }, { body: updatedTimeEntry }, { body: [updatedTimeEntry] }]);
    const { result: timeEntriesHook } = await renderUseTimeEntries();

    await act(async () => {
      await timeEntriesHook.current.updateTimeEntry(existingTimeEntry.id, timeEntryForm);
    });

    expect(httpClient).toHaveBeenNthCalledWith(
      2,
      "/freelance/time-entries/time-entry-id",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(JSON.parse(httpClient.mock.calls[1][1].body).durationMinutes).toBe(90);
    expect(timeEntriesHook.current.timeEntries).toEqual([updatedTimeEntry]);
  });

  it("shows the locked toast when the update is rejected because the entry is invoiced", async () => {
    mockHttpResponses([{ body: [existingTimeEntry] }, { status: 409, body: { message: "Time entry is locked" } }]);
    const { result: timeEntriesHook } = await renderUseTimeEntries();

    await act(async () => {
      await expect(
        timeEntriesHook.current.updateTimeEntry(existingTimeEntry.id, timeEntryForm),
      ).rejects.toMatchObject({ status: 409 });
    });

    expect(addToast).toHaveBeenCalledWith({ title: "toasts.lockedTitle", description: "toasts.lockedDescription", color: "danger" });
  });

  it("shows the generic error toast when a mutation fails for another reason", async () => {
    mockHttpResponses([{ body: [] }, { status: 400, body: { message: "durationMinutes must be a multiple of 15" } }]);
    const { result: timeEntriesHook } = await renderUseTimeEntries();

    await act(async () => {
      await expect(timeEntriesHook.current.createTimeEntry(timeEntryForm)).rejects.toMatchObject({
        status: 400,
        responseMessage: "durationMinutes must be a multiple of 15",
      });
    });

    expect(addToast).toHaveBeenCalledWith({
      title: "toasts.genericErrorTitle",
      description: "toasts.genericErrorDescription",
      color: "danger",
    });
  });

  it("deletes a time entry and reloads the week", async () => {
    mockHttpResponses([{ body: [existingTimeEntry] }, { status: 204, body: null }, { body: [] }]);
    const { result: timeEntriesHook } = await renderUseTimeEntries();

    await act(async () => {
      await timeEntriesHook.current.deleteTimeEntry(existingTimeEntry.id);
    });

    expect(httpClient).toHaveBeenNthCalledWith(
      2,
      "/freelance/time-entries/time-entry-id",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(timeEntriesHook.current.timeEntries).toEqual([]);
  });

  it("shows the locked toast and throws when the delete is rejected", async () => {
    mockHttpResponses([{ body: [existingTimeEntry] }, { status: 409, body: null }]);
    const { result: timeEntriesHook } = await renderUseTimeEntries();

    await act(async () => {
      await expect(timeEntriesHook.current.deleteTimeEntry(existingTimeEntry.id)).rejects.toMatchObject({ status: 409 });
    });

    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: "toasts.lockedTitle" }));
    expect(timeEntriesHook.current.timeEntries).toEqual([existingTimeEntry]);
  });
});
