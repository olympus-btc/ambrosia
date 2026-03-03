import { httpClient, parseJsonResponse } from "@/lib/http";

export async function getTurnOpen() {
  const response = await httpClient("/shifts/open");
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`Failed to get open shift: ${response.status}`);
  const shift = await parseJsonResponse(response, null);
  return shift ?? null;
}

export async function openTurn(userId, initialAmount = 0) {
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
      initial_amount: initialAmount,
    }),
  });
  return await parseJsonResponse(response, null);
}

export async function closeTurn(openTurnId, finalAmount = null) {
  const body = finalAmount !== null ? JSON.stringify({ final_amount: finalAmount }) : "{}";
  const response = await httpClient(`/shifts/${openTurnId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!response.ok) throw new Error(`Close failed: ${response.status}`);
  return await parseJsonResponse(response, null);
}
