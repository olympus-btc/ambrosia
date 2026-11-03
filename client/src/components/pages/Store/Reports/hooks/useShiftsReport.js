"use client";
import { useCallback, useState } from "react";

import { getShiftsReport } from "@/services/shiftsService";

export function useShiftsReport() {
  const [shiftsReportData, setShiftsReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchShiftsReport = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const shiftsReport = await getShiftsReport(filters);
      setShiftsReportData(shiftsReport);
      return shiftsReport;
    } catch (fetchError) {
      setError(fetchError);
      throw fetchError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchShiftsReport, shiftsReportData, loading, error };
}
