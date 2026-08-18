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

export async function closeTurn(openTurnId, finalAmount = null, difference = null) {
  const body = JSON.stringify({ finalAmount, difference });
  const closeShiftResponse = await httpClient(`/shifts/${openTurnId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    skipForbiddenRedirect: true,
  });
  if (!closeShiftResponse.ok) {
    throw await buildParsedHttpError(closeShiftResponse, "Failed to close shift");
  }
  return await parseJsonResponse(closeShiftResponse, null);
}
