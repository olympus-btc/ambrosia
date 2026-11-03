"use client";
import { useCallback, useMemo, useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { downloadCsv } from "../utils/downloadCsv";
import { formatLocalDateStamp } from "../utils/formatLocalDateStamp";

const DEFAULT_ROWS_PER_PAGE = 10;

export function useShiftsReportData(shifts, formatCurrency) {
  const reportsTranslations = useTranslations("reports");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [previousShifts, setPreviousShifts] = useState(shifts);

  if (previousShifts !== shifts) {
    setPreviousShifts(shifts);
    setPage(1);
  }

  const totalPages = useMemo(() => Math.ceil(shifts.length / rowsPerPage), [shifts, rowsPerPage]);
  const paginatedShifts = useMemo(
    () => shifts.slice((page - 1) * rowsPerPage, page * rowsPerPage),
    [shifts, page, rowsPerPage],
  );

  const handleRowsPerPageChange = useCallback((newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setPage(1);
  }, []);

  const exportToCsv = useCallback(() => {
    if (!shifts.length) return;
    try {
      const csvHeaders = [
        reportsTranslations("shiftsReport.user"),
        reportsTranslations("shiftsReport.openedAt"),
        reportsTranslations("shiftsReport.closedAt"),
        reportsTranslations("shiftsReport.initialAmount"),
        reportsTranslations("shiftsReport.finalAmount"),
        reportsTranslations("shiftsReport.difference"),
      ];
      const csvRows = shifts.map((shift) => [
        shift.userName,
        `${shift.shiftDate} ${shift.startTime}`,
        shift.endTime ? `${shift.shiftDate} ${shift.endTime}` : "",
        formatCurrency(shift.initialAmount),
        shift.finalAmount != null ? formatCurrency(shift.finalAmount) : "",
        shift.difference != null ? formatCurrency(shift.difference) : "",
      ]);

      const csv = [csvHeaders, ...csvRows]
        .map((csvRow) => csvRow.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      downloadCsv(csv, `shifts-report-${formatLocalDateStamp()}.csv`);
    } catch {
      addToast({ color: "danger", description: reportsTranslations("export.error") });
    }
  }, [shifts, formatCurrency, reportsTranslations]);

  return { paginatedShifts, totalPages, page, setPage, rowsPerPage, handleRowsPerPageChange, exportToCsv };
}
