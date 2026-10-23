import { buildParsedHttpError } from "@/components/pages/Store/utils/buildHttpError";
import { httpClient, parseJsonResponse } from "@/lib/http";

export async function getTurnOpen() {
  const openShiftResponse = await httpClient("/shifts/open", { skipForbiddenRedirect: true });
  if (openShiftResponse.status === 204) return null;
  if (!openShiftResponse.ok) {
    throw await buildParsedHttpError(openShiftResponse, "Failed to get open shift");
  }
  const shift = await parseJsonResponse(openShiftResponse, null);
  return shift ?? null;
}

export async function openTurn(userId, initialAmount = 0) {
  const now = new Date();
  const shiftDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const startTime = now.toTimeString().split(" ")[0];

  const openShiftResponse = await httpClient("/shifts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      shiftDate,
      startTime,
      notes: "",
      initialAmount,
    }),
    skipForbiddenRedirect: true,
  });
  if (openShiftResponse.status === 409) throw new Error("shift_already_open");
  if (!openShiftResponse.ok) {
    throw await buildParsedHttpError(openShiftResponse, "Failed to open shift");
  }
  return await parseJsonResponse(openShiftResponse, null);
}

export async function getShiftsReport(filters = {}) {
  const shiftsReportQueryParams = new URLSearchParams();
  if (filters.period) shiftsReportQueryParams.set("period", filters.period);
  if (filters.startDate) shiftsReportQueryParams.set("startDate", filters.startDate);
  if (filters.endDate) shiftsReportQueryParams.set("endDate", filters.endDate);

  const shiftsReportResponse = await httpClient(`/shifts/report?${shiftsReportQueryParams.toString()}`, {
    skipForbiddenRedirect: true,
  });
  if (!shiftsReportResponse.ok) {
    throw await buildParsedHttpError(shiftsReportResponse, "Failed to get shifts report");
  }
  return await parseJsonResponse(shiftsReportResponse, null);
}

export async function getShiftBreakdown(shiftId) {
  const shiftBreakdownResponse = await httpClient(`/shifts/${shiftId}/breakdown`, {
    skipForbiddenRedirect: true,
  });
  if (!shiftBreakdownResponse.ok) {
    throw await buildParsedHttpError(shiftBreakdownResponse, "Failed to get shift breakdown");
  }
  return await parseJsonResponse(shiftBreakdownResponse, null);
}

export async function closeTurn(openTurnId, finalAmount = null, difference = null) {
  const closeShiftRequestBody = JSON.stringify({ finalAmount, difference });
  const closeShiftResponse = await httpClient(`/shifts/${openTurnId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: closeShiftRequestBody,
    skipForbiddenRedirect: true,
  });
  if (!closeShiftResponse.ok) {
    throw await buildParsedHttpError(closeShiftResponse, "Failed to close shift");
  }
  return await parseJsonResponse(closeShiftResponse, null);
}

export async function printShiftReport(shiftId, labels) {
  const printShiftReportResponse = await httpClient(`/shifts/${shiftId}/print-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ labels }),
    skipForbiddenRedirect: true,
  });
  if (!printShiftReportResponse.ok) {
    throw await buildParsedHttpError(printShiftReportResponse, "Failed to print shift report");
  }
  return true;
}
