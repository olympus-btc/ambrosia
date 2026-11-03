import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { useTimeEntries } from "../../hooks/useTimeEntries";
import { useTimesheetCatalog } from "../../hooks/useTimesheetCatalog";
import { Timesheet } from "../Timesheet";
import { addDays, getWeekStart, toIsoDate } from "../utils/week";

jest.mock("../../hooks/useTimeEntries", () => ({
  useTimeEntries: jest.fn(),
}));

jest.mock("../../hooks/useTimesheetCatalog", () => ({
  useTimesheetCatalog: jest.fn(),
}));

let mockGrantedPermissions = new Set();
jest.mock("@/hooks/usePermission", () => ({
  usePermission: ({ allOf = [] } = {}) => allOf.every((permissionName) => mockGrantedPermissions.has(permissionName)),
  RequirePermission: ({ allOf = [], children }) => (
    allOf.every((permissionName) => mockGrantedPermissions.has(permissionName)) ? children : null
  ),
}));

jest.mock("@heroui/react", () => {
  const actualHeroUiModule = jest.requireActual("@heroui/react");
  return { ...actualHeroUiModule, addToast: jest.fn() };
});

const ALL_TIME_ENTRY_PERMISSIONS = ["time_entries_read", "time_entries_create", "time_entries_update", "time_entries_delete"];
const todayIsoDate = toIsoDate(new Date());
const currentWeekStart = getWeekStart(new Date());

const editableTimeEntry = {
  id: "editable-id",
  projectId: "project-id",
  projectName: "Website",
  taskId: "task-id",
  taskName: "Development",
  clientName: "Acme",
  entryDate: todayIsoDate,
  description: "Landing page",
  durationMinutes: 60,
  startTime: null,
  endTime: null,
  isLocked: false,
};

const lockedTimeEntry = {
  ...editableTimeEntry,
  id: "locked-id",
  projectName: "Invoiced project",
  taskName: "Invoicing",
  durationMinutes: 45,
  isLocked: true,
};

let timeEntriesHookValue;

function renderTimesheet(timeEntriesHookOverrides = {}) {
  timeEntriesHookValue = {
    timeEntries: [editableTimeEntry, lockedTimeEntry],
    forbidden: false,
    createTimeEntry: jest.fn().mockResolvedValue({}),
    updateTimeEntry: jest.fn().mockResolvedValue({}),
    deleteTimeEntry: jest.fn().mockResolvedValue(undefined),
    ...timeEntriesHookOverrides,
  };
  useTimeEntries.mockImplementation(() => timeEntriesHookValue);
  useTimesheetCatalog.mockReturnValue({
    clients: [{ id: "client-id", name: "Acme" }],
    projects: [{ id: "project-id", clientId: "client-id", name: "Website" }],
    tasks: [{ id: "task-id", name: "Development" }],
    refetchTasks: jest.fn(),
  });
  return render(<Timesheet />);
}

async function openReadOnlyModal(taskName) {
  fireEvent.click(screen.getByText(taskName));
  const timeEntryDialog = await screen.findByRole("dialog");
  await waitFor(() => expect(within(timeEntryDialog).getByText("modal.titleView")).toBeInTheDocument());
  return timeEntryDialog;
}

async function openEditModalFromDetails(taskName) {
  const timeEntryDialog = await openReadOnlyModal(taskName);
  fireEvent.click(within(timeEntryDialog).getByRole("button", { name: "modal.editButton" }));
  await waitFor(() => expect(within(timeEntryDialog).getByText("modal.titleEdit")).toBeInTheDocument());
  return timeEntryDialog;
}

describe("Timesheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGrantedPermissions = new Set(ALL_TIME_ENTRY_PERMISSIONS);
  });

  it("requests the current week from monday to sunday", () => {
    renderTimesheet();

    expect(useTimeEntries).toHaveBeenLastCalledWith({
      fromDate: toIsoDate(currentWeekStart),
      toDate: toIsoDate(addDays(currentWeekStart, 6)),
      clientId: "",
      projectId: "",
    });
  });

  it("renders one column per day with the entries of that day and its total", () => {
    renderTimesheet();

    const todayColumn = within(screen.getByTestId(`day-column-${todayIsoDate}`));
    expect(screen.getAllByTestId(/^day-column-/)).toHaveLength(7);
    expect(todayColumn.getByText("Development")).toBeInTheDocument();
    expect(todayColumn.getByText("Invoicing")).toBeInTheDocument();
    expect(todayColumn.getByTestId("day-total")).toHaveTextContent("1:45");
    expect(screen.getByTestId("week-total")).toHaveTextContent("1:45");
  });

  it("highlights only today's column with a background", () => {
    renderTimesheet();

    const highlightedDayColumns = screen.getAllByTestId(/^day-column-/)
      .filter((dayColumn) => dayColumn.className.includes("bg-green-50"));
    expect(highlightedDayColumns).toHaveLength(1);
    expect(highlightedDayColumns[0]).toHaveAttribute("data-testid", `day-column-${todayIsoDate}`);
  });

  it("moves to the previous and next week", () => {
    renderTimesheet();

    fireEvent.click(screen.getByRole("button", { name: "previousWeek" }));
    expect(useTimeEntries).toHaveBeenLastCalledWith(expect.objectContaining({
      fromDate: toIsoDate(addDays(currentWeekStart, -7)),
    }));

    fireEvent.click(screen.getByRole("button", { name: "nextWeek" }));
    fireEvent.click(screen.getByRole("button", { name: "nextWeek" }));
    expect(useTimeEntries).toHaveBeenLastCalledWith(expect.objectContaining({
      fromDate: toIsoDate(addDays(currentWeekStart, 7)),
    }));

    fireEvent.click(screen.getByRole("button", { name: "today" }));
    expect(useTimeEntries).toHaveBeenLastCalledWith(expect.objectContaining({
      fromDate: toIsoDate(currentWeekStart),
    }));
  });

  it("edits an entry and saves it through updateTimeEntry", async () => {
    renderTimesheet();

    const editDialog = await openEditModalFromDetails("Development");

    fireEvent.change(within(editDialog).getByLabelText(/modal.durationLabel/), { target: { value: "2:10" } });
    fireEvent.keyDown(within(editDialog).getByRole("slider", { name: "modal.adjustDuration" }), { key: "ArrowUp" });
    await act(async () => {
      fireEvent.click(within(editDialog).getByRole("button", { name: "modal.saveButton" }));
    });

    expect(timeEntriesHookValue.updateTimeEntry).toHaveBeenCalledWith("editable-id", expect.objectContaining({
      projectId: "project-id",
      taskId: "task-id",
      entryDate: todayIsoDate,
      description: "Landing page",
      durationMinutes: 150,
    }));
  });

  it("opens the entry in read only mode before editing", async () => {
    renderTimesheet();

    const timeEntryDialog = await openReadOnlyModal("Development");

    const readableTodayDate = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      .format(new Date());

    expect(within(timeEntryDialog).getByText("Acme")).toBeInTheDocument();
    expect(within(timeEntryDialog).getByLabelText(/modal.dateLabel/)).toHaveAttribute("readonly");
    expect(within(timeEntryDialog).getByLabelText(/modal.dateLabel/)).toHaveValue(readableTodayDate);
    expect(within(timeEntryDialog).getByLabelText(/modal.durationLabel/)).toHaveAttribute("readonly");
    expect(within(timeEntryDialog).getByLabelText(/modal.taskLabel/)).toHaveAttribute("readonly");
    expect(within(timeEntryDialog).getByLabelText(/modal.taskLabel/)).toHaveValue("Development");
    expect(within(timeEntryDialog).queryByRole("combobox", { name: /modal.taskLabel/ })).not.toBeInTheDocument();
    expect(within(timeEntryDialog).getByLabelText(/modal.descriptionLabel/)).toHaveAttribute("readonly");
    expect(within(timeEntryDialog).getByLabelText(/modal.descriptionLabel/)).toHaveValue("Landing page");
    expect(within(timeEntryDialog).queryByRole("slider")).not.toBeInTheDocument();
    expect(within(timeEntryDialog).queryByRole("button", { name: "modal.saveButton" })).not.toBeInTheDocument();
    expect(within(timeEntryDialog).queryByRole("button", { name: "delete" })).not.toBeInTheDocument();
    expect(within(timeEntryDialog).getByRole("button", { name: "modal.closeButton" })).toBeInTheDocument();
  });

  it("enables the fields after pressing edit", async () => {
    renderTimesheet();

    const timeEntryDialog = await openEditModalFromDetails("Development");

    expect(within(timeEntryDialog).getByRole("group", { name: /modal.dateLabel/ })).toBeInTheDocument();
    expect(timeEntryDialog.querySelector("input[name='entryDate']")).toHaveValue(todayIsoDate);
    expect(within(timeEntryDialog).getByLabelText(/modal.descriptionLabel/)).not.toHaveAttribute("readonly");
    expect(within(timeEntryDialog).getByRole("slider", { name: "modal.adjustDuration" })).toBeInTheDocument();
    expect(within(timeEntryDialog).getByRole("button", { name: "modal.saveButton" })).toBeInTheDocument();
  });

  it("returns to read only mode with the original values when cancelling the edit", async () => {
    renderTimesheet();

    const timeEntryDialog = await openEditModalFromDetails("Development");
    fireEvent.change(within(timeEntryDialog).getByLabelText(/modal.descriptionLabel/), { target: { value: "Changed" } });
    fireEvent.click(within(timeEntryDialog).getByRole("button", { name: "modal.cancelButton" }));

    await waitFor(() => expect(within(timeEntryDialog).getByText("modal.titleView")).toBeInTheDocument());
    expect(within(timeEntryDialog).getByLabelText(/modal.descriptionLabel/)).toHaveValue("Landing page");
    expect(timeEntriesHookValue.updateTimeEntry).not.toHaveBeenCalled();
  });

  it("shows locked entries in read only mode without the edit button", async () => {
    renderTimesheet();

    const timeEntryDialog = await openReadOnlyModal("Invoicing");

    expect(within(timeEntryDialog).getByText("lockedEntry")).toBeInTheDocument();
    expect(within(timeEntryDialog).queryByRole("button", { name: "modal.editButton" })).not.toBeInTheDocument();
  });

  it("hides the edit button without the update permission", async () => {
    mockGrantedPermissions = new Set(["time_entries_read"]);
    renderTimesheet();

    const timeEntryDialog = await openReadOnlyModal("Development");

    expect(within(timeEntryDialog).queryByRole("button", { name: "modal.editButton" })).not.toBeInTheDocument();
  });

  it("opens an empty entry form for the selected day", async () => {
    renderTimesheet();

    const todayColumn = within(screen.getByTestId(`day-column-${todayIsoDate}`));
    fireEvent.click(todayColumn.getByRole("button", { name: "addEntry" }));
    const addDialog = await screen.findByRole("dialog");

    expect(within(addDialog).getByText("modal.titleAdd")).toBeInTheDocument();
    expect(addDialog.querySelector("input[name='entryDate']")).toHaveValue(todayIsoDate);
    expect(within(addDialog).getByRole("button", { name: "modal.saveButton" })).toBeDisabled();
  });

  it("keeps the task field disabled until a project is selected", async () => {
    renderTimesheet();

    const todayColumn = within(screen.getByTestId(`day-column-${todayIsoDate}`));
    fireEvent.click(todayColumn.getByRole("button", { name: "addEntry" }));
    const addDialog = await screen.findByRole("dialog");

    expect(within(addDialog).getByRole("combobox", { name: /modal.taskLabel/ })).toBeDisabled();
    expect(within(addDialog).getByText("modal.selectProjectFirst")).toBeInTheDocument();
  });

  it("enables the task field when editing an entry that already has a project", async () => {
    renderTimesheet();

    const editDialog = await openEditModalFromDetails("Development");

    expect(within(editDialog).getByRole("combobox", { name: /modal.taskLabel/ })).not.toBeDisabled();
  });

  it("saves a typed task name that does not exist yet and reloads the tasks", async () => {
    mockGrantedPermissions = new Set([...ALL_TIME_ENTRY_PERMISSIONS, "tasks_create"]);
    renderTimesheet();

    const editDialog = await openEditModalFromDetails("Development");
    fireEvent.change(within(editDialog).getByRole("combobox", { name: /modal.taskLabel/ }), { target: { value: "Code review" } });

    expect(within(editDialog).getByText("modal.newTaskHint")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(within(editDialog).getByRole("button", { name: "modal.saveButton" }));
    });

    expect(timeEntriesHookValue.updateTimeEntry).toHaveBeenCalledWith("editable-id", expect.objectContaining({
      taskId: "",
      taskName: "Code review",
    }));
    expect(useTimesheetCatalog.mock.results.at(-1).value.refetchTasks).toHaveBeenCalled();
  });

  it("does not allow saving an unknown task name without the create permission", async () => {
    renderTimesheet();

    const editDialog = await openEditModalFromDetails("Development");
    fireEvent.change(within(editDialog).getByRole("combobox", { name: /modal.taskLabel/ }), { target: { value: "Code review" } });

    expect(within(editDialog).getByText("modal.unknownTask")).toBeInTheDocument();
    expect(within(editDialog).getByRole("button", { name: "modal.saveButton" })).toBeDisabled();
  });

  it("deletes an entry from the edit modal after confirming", async () => {
    renderTimesheet();

    const editDialog = await openEditModalFromDetails("Development");
    fireEvent.click(within(editDialog).getByRole("button", { name: "delete" }));
    await waitFor(() => expect(screen.getByText("modal.titleDelete")).toBeInTheDocument());
    const deleteDialog = screen.getByText("modal.titleDelete").closest("[role='dialog']");
    await act(async () => {
      fireEvent.click(within(deleteDialog).getByRole("button", { name: "modal.deleteButton" }));
    });

    expect(timeEntriesHookValue.deleteTimeEntry).toHaveBeenCalledWith("editable-id");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("hides the delete button in the edit modal without the delete permission", async () => {
    mockGrantedPermissions = new Set(["time_entries_read", "time_entries_update"]);
    renderTimesheet();

    const editDialog = await openEditModalFromDetails("Development");

    expect(within(editDialog).queryByRole("button", { name: "delete" })).not.toBeInTheDocument();
  });

  it("does not show the delete button when adding an entry", async () => {
    renderTimesheet();

    const todayColumn = within(screen.getByTestId(`day-column-${todayIsoDate}`));
    fireEvent.click(todayColumn.getByRole("button", { name: "addEntry" }));
    const addDialog = await screen.findByRole("dialog");

    expect(within(addDialog).queryByRole("button", { name: "delete" })).not.toBeInTheDocument();
  });

  it("hides the create controls without permissions", () => {
    mockGrantedPermissions = new Set(["time_entries_read"]);
    renderTimesheet();

    expect(screen.queryByRole("button", { name: "addEntry" })).not.toBeInTheDocument();
  });

  it("shows the permission blocked message when reading is forbidden", () => {
    renderTimesheet({ forbidden: true });

    expect(screen.getByText("permissionBlocked.title")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^day-column-/)).toHaveLength(0);
  });
});
