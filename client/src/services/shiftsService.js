import { httpClient, parseJsonResponse } from "@/lib/http";

export async function getTurnOpen() {
  const response = await httpClient("/shifts/open");
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`Failed to get open shift: ${response.status}`);
  const shift = await parseJsonResponse(response, null);
  return shift?.id ?? null;
}

export async function openTurn(userId) {
  const now = new Date();
  const shiftDate = now.toISOString().split("T")[0];
  const startTime = now.toTimeString().split(" ")[0];

  const response = await httpClient("/shifts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      shift_date: shiftDate,
      start_time: startTime,
      notes: "",
    }),
  });
  return await parseJsonResponse(response, null);
}

export async function closeTurn(openTurnId) {
  const response = await httpClient(`/shifts/${openTurnId}/close`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(`Close failed: ${response.status}`);
  return await parseJsonResponse(response, null);
}
