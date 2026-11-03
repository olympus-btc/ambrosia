"use client";
import { Button, Card, CardBody, Pagination, Select, SelectItem } from "@heroui/react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { useShiftsReportData } from "../hooks/useShiftsReportData";

import { ShiftsList } from "./ShiftsList";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export function ShiftsReportCard({ shifts, formatCurrency }) {
  const reportsTranslations = useTranslations("reports");
  const { paginatedShifts, totalPages, page, setPage, rowsPerPage, handleRowsPerPageChange, exportToCsv } =
    useShiftsReportData(shifts, formatCurrency);

  return (
    <Card shadow="none" className="shadow-lg bg-white rounded-lg p-4 lg:p-8">
      <CardBody className="space-y-4">

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-lg">
            {reportsTranslations("shiftsReport.title")}
            <span className="ml-2 text-sm font-normal text-default-400">
              ({shifts.length} {reportsTranslations("shiftsReport.records")})
            </span>
          </h2>
          <Button
            variant="bordered"
            size="sm"
            className="border border-green-800 text-green-800"
            startContent={<Download aria-hidden="true" className="w-3.5 h-3.5" />}
            isDisabled={!shifts.length}
            onPress={exportToCsv}
          >
            {reportsTranslations("shiftsReport.export")}
          </Button>
        </div>

        <ShiftsList shifts={paginatedShifts} formatCurrency={formatCurrency} />

        <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-default-100">
          <div className="flex items-center gap-2 text-sm text-default-500">
            <span>{reportsTranslations("sales.show")}</span>
            <Select
              aria-label={reportsTranslations("sales.rowsPerPage")}
              size="sm"
              variant="bordered"
              className="w-20"
              classNames={{ trigger: "h-7 min-h-7 py-0", value: "text-sm translate-y-0" }}
              selectedKeys={new Set([String(rowsPerPage)])}
              onSelectionChange={(selectedRowsPerPageKeys) => {
                const selectedRowsPerPageKey = [...selectedRowsPerPageKeys][0];
                if (selectedRowsPerPageKey) handleRowsPerPageChange(Number(selectedRowsPerPageKey));
              }}
            >
              {ROWS_PER_PAGE_OPTIONS.map((size) => (
                <SelectItem key={String(size)}>{String(size)}</SelectItem>
              ))}
            </Select>
            <span>{reportsTranslations("sales.perPage")}</span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 sm:gap-3">
              <span className="hidden sm:inline text-sm text-default-500">
                {reportsTranslations("sales.pageLabel")} {page} {reportsTranslations("sales.ofLabel")} {totalPages}
              </span>
              <Pagination
                className="sm:hidden"
                total={totalPages}
                page={page}
                onChange={setPage}
                color="primary"
                showControls
                size="sm"
                siblings={0}
                boundaries={1}
                aria-label={reportsTranslations("shiftsReport.paginationAria")}
              />
              <Pagination
                className="hidden sm:flex"
                total={totalPages}
                page={page}
                onChange={setPage}
                color="primary"
                showControls
                size="sm"
                siblings={1}
                boundaries={1}
                aria-label={reportsTranslations("shiftsReport.paginationAria")}
              />
            </div>
          )}
        </div>

      </CardBody>
    </Card>
  );
}
