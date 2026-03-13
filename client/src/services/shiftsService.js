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
  const shiftDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
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
  if (response.status === 409) throw new Error("shift_already_open");
  if (!response.ok) throw new Error(`Failed to open shift: ${response.status}`);
  return await parseJsonResponse(response, null);
}

export async function closeTurn(openTurnId, finalAmount = null, difference = null) {
  const body = JSON.stringify({ final_amount: finalAmount, difference });
  const response = await httpClient(`/shifts/${openTurnId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!response.ok) throw new Error(`Close failed: ${response.status}`);
  return await parseJsonResponse(response, null);
}
