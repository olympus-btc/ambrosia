import { snapToQuarterHour } from "./quarterHour";

export function buildTimeEntryPayload({ projectId, taskId, taskName, entryDate, description, durationMinutes, startTime, endTime }) {
  const trimmedDescription = description?.trim();
  return {
    projectId,
    taskId: taskId || null,
    taskName: taskId ? null : taskName?.trim() || null,
    entryDate,
    description: trimmedDescription || null,
    durationMinutes: snapToQuarterHour(durationMinutes),
    startTime: startTime ?? null,
    endTime: endTime ?? null,
  };
}
