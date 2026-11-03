import { useCallback } from "react";

import { httpClient } from "@/lib/http";

export function useCashDrawer() {
  const openCashDrawer = useCallback(async (printerConfigId = null) => {
    const openCashDrawerResponse = await httpClient("/printers/cash-drawer/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printerId: printerConfigId }),
      skipForbiddenRedirect: true,
    });
    if (!openCashDrawerResponse.ok) {
      throw new Error("cash_drawer_not_opened");
    }
  }, []);

  const openCashDrawerForShiftClose = useCallback(async (shiftId) => {
    if (!shiftId) return;
    try {
      await httpClient(`/shifts/${shiftId}/cash-drawer`, { method: "POST", skipForbiddenRedirect: true });
    } catch (shiftCloseCashDrawerError) {
      console.error("Error opening the cash drawer for the shift close:", shiftCloseCashDrawerError);
    }
  }, []);

  return { openCashDrawer, openCashDrawerForShiftClose };
}
