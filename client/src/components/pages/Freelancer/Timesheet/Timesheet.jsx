"use client";
import { useState, useSyncExternalStore } from "react";

import { addToast, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { RequirePermission, usePermission } from "@/hooks/usePermission";
import { PageHeader } from "@components/shared/PageHeader";
import { PermissionBlockedMessage } from "@components/shared/PermissionBlockedMessage";

import { useTimeEntries } from "../hooks/useTimeEntries";
import { useTimesheetCatalog } from "../hooks/useTimesheetCatalog";

import { DeleteTimeEntryModal } from "./DeleteTimeEntryModal";
import { TimeEntryModal } from "./TimeEntryModal";
import { TimesheetFilter } from "./TimesheetFilter";
import { sumDurationMinutes } from "./utils/groupEntriesByDay";
import { addDays, DAYS_IN_WEEK, getWeekDays, getWeekStart, parseIsoDate, toIsoDate } from "./utils/week";
import { withOpenedTimeEntryOption } from "./utils/withOpenedTimeEntryOption";
import { WeekGrid } from "./WeekGrid";
import { WeekNavigator } from "./WeekNavigator";

const subscribeToNothing = () => () => {};
const getClientTodayIsoDate = () => toIsoDate(new Date());
const getServerTodayIsoDate = () => null;

function createEmptyTimeEntryForm(entryDate) {
  return {
    projectId: "",
    taskId: "",
    taskName: "",
    entryDate,
    description: "",
    durationMinutes: null,
    startTime: null,
    endTime: null,
  };
}

function toTimeEntryForm(timeEntry) {
  return {
    projectId: timeEntry.projectId,
    taskId: timeEntry.taskId,
    taskName: timeEntry.taskName ?? "",
    entryDate: timeEntry.entryDate,
    description: timeEntry.description ?? "",
    durationMinutes: timeEntry.durationMinutes,
    startTime: timeEntry.startTime,
    endTime: timeEntry.endTime,
  };
}

export function Timesheet() {
  const timesheetTranslations = useTranslations("timesheet");
  const todayIsoDate = useSyncExternalStore(subscribeToNothing, getClientTodayIsoDate, getServerTodayIsoDate);
  const [weekOffset, setWeekOffset] = useState(0);
  const [timeEntryForm, setTimeEntryForm] = useState(() => createEmptyTimeEntryForm(""));
  const [editingTimeEntryId, setEditingTimeEntryId] = useState(null);
  const [isTimeEntryModalOpen, setIsTimeEntryModalOpen] = useState(false);
  const [timeEntryToDelete, setTimeEntryToDelete] = useState(null);
  const [isTimeEntryReadOnly, setIsTimeEntryReadOnly] = useState(false);
  const [timesheetFilters, setTimesheetFilters] = useState({ clientId: "", projectId: "" });

  const weekStart = todayIsoDate
    ? addDays(getWeekStart(parseIsoDate(todayIsoDate)), weekOffset * DAYS_IN_WEEK)
    : null;
  const weekDays = weekStart ? getWeekDays(weekStart) : [];
  const weekEnd = weekDays[weekDays.length - 1] ?? null;
  const canCreate = usePermission({ allOf: ["time_entries_create"] });
  const canUpdate = usePermission({ allOf: ["time_entries_update"] });
  const canDelete = usePermission({ allOf: ["time_entries_delete"] });
  const canCreateTask = usePermission({ allOf: ["tasks_create"] });

  const {
    timeEntries,
    forbidden: timeEntriesForbidden,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
  } = useTimeEntries({
    fromDate: weekStart ? toIsoDate(weekStart) : null,
    toDate: weekEnd ? toIsoDate(weekEnd) : null,
    clientId: timesheetFilters.clientId,
    projectId: timesheetFilters.projectId,
  });
  const { clients, projects, tasks, refetchTasks } = useTimesheetCatalog();
  const openedTimeEntry = timeEntries.find((timeEntry) => timeEntry.id === editingTimeEntryId) ?? null;
  const projectOptions = withOpenedTimeEntryOption(projects, openedTimeEntry?.projectId, openedTimeEntry?.projectName);
  const taskOptions = withOpenedTimeEntryOption(tasks, openedTimeEntry?.taskId, openedTimeEntry?.taskName);

  const handleTimeEntryFormChange = (timeEntryFormUpdates) => {
    setTimeEntryForm((previousTimeEntryForm) => ({ ...previousTimeEntryForm, ...timeEntryFormUpdates }));
  };

  const handleAddEntry = (entryDate) => {
    setEditingTimeEntryId(null);
    setIsTimeEntryReadOnly(false);
    setTimeEntryForm(createEmptyTimeEntryForm(entryDate));
    setIsTimeEntryModalOpen(true);
  };

  const handleViewEntry = (timeEntry) => {
    setEditingTimeEntryId(timeEntry.id);
    setIsTimeEntryReadOnly(true);
    setTimeEntryForm(toTimeEntryForm(timeEntry));
    setIsTimeEntryModalOpen(true);
  };

  const handleCloseTimeEntryModal = () => {
    setIsTimeEntryModalOpen(false);
    setEditingTimeEntryId(null);
  };

  const handleCancelTimeEntryEdit = () => {
    if (!openedTimeEntry) {
      handleCloseTimeEntryModal();
      return;
    }
    setTimeEntryForm(toTimeEntryForm(openedTimeEntry));
    setIsTimeEntryReadOnly(true);
  };

  const handleDeleteEditingEntry = () => {
    handleCloseTimeEntryModal();
    if (openedTimeEntry) setTimeEntryToDelete(openedTimeEntry);
  };

  const handleSubmitTimeEntry = async () => {
    if (editingTimeEntryId) {
      await updateTimeEntry(editingTimeEntryId, timeEntryForm);
      addToast({ description: timesheetTranslations("toasts.updateSuccess"), color: "success" });
    } else {
      await createTimeEntry(timeEntryForm);
      addToast({ description: timesheetTranslations("toasts.createSuccess"), color: "success" });
    }
    if (!timeEntryForm.taskId) refetchTasks();
    handleCloseTimeEntryModal();
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteTimeEntry(timeEntryToDelete.id);
      addToast({ description: timesheetTranslations("toasts.deleteSuccess"), color: "success" });
      setTimeEntryToDelete(null);
    } catch {
      return;
    }
  };

  if (timeEntriesForbidden) {
    return (
      <>
        <PageHeader title={timesheetTranslations("title")} subtitle={timesheetTranslations("subtitle")} />
        <PermissionBlockedMessage
          title={timesheetTranslations("permissionBlocked.title")}
          subtitle={timesheetTranslations("permissionBlocked.subtitle")}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={timesheetTranslations("title")}
        subtitle={timesheetTranslations("subtitle")}
        actions={(
          <RequirePermission allOf={["time_entries_create"]}>
            <Button
              color="primary"
              className="bg-green-800"
              isDisabled={!todayIsoDate}
              onPress={() => handleAddEntry(todayIsoDate)}
            >
              {timesheetTranslations("addEntry")}
            </Button>
          </RequirePermission>
        )}
      />

      {weekStart && (
        <>
          <WeekNavigator
            weekStart={weekStart}
            weekEnd={weekEnd}
            weekTotalMinutes={sumDurationMinutes(timeEntries)}
            filterControl={(
              <TimesheetFilter
                filters={timesheetFilters}
                clients={clients}
                projects={projects}
                onFiltersChange={setTimesheetFilters}
                triggerClassName="border border-green-800 text-green-800"
              />
            )}
            onPreviousWeek={() => setWeekOffset((currentWeekOffset) => currentWeekOffset - 1)}
            onNextWeek={() => setWeekOffset((currentWeekOffset) => currentWeekOffset + 1)}
            onCurrentWeek={() => setWeekOffset(0)}
          />

          <WeekGrid
            weekDays={weekDays}
            todayIsoDate={todayIsoDate}
            timeEntries={timeEntries}
            canCreate={canCreate}
            onAddEntry={handleAddEntry}
            onViewEntry={handleViewEntry}
          />
        </>
      )}

      <TimeEntryModal
        isOpen={isTimeEntryModalOpen}
        isEditing={Boolean(editingTimeEntryId)}
        isReadOnly={isTimeEntryReadOnly}
        isLocked={Boolean(openedTimeEntry?.isLocked)}
        clientName={openedTimeEntry?.clientName}
        canEdit={canUpdate && !openedTimeEntry?.isLocked}
        timeEntryForm={timeEntryForm}
        projects={projectOptions}
        tasks={taskOptions}
        canCreateTask={canCreateTask}
        canDelete={canDelete}
        onChange={handleTimeEntryFormChange}
        onSubmit={handleSubmitTimeEntry}
        onDelete={handleDeleteEditingEntry}
        onStartEditing={() => setIsTimeEntryReadOnly(false)}
        onCancel={handleCancelTimeEntryEdit}
        onClose={handleCloseTimeEntryModal}
      />

      <DeleteTimeEntryModal
        timeEntry={timeEntryToDelete}
        isOpen={Boolean(timeEntryToDelete)}
        onClose={() => setTimeEntryToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
