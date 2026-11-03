"use client";

import { useState } from "react";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/DataTable";
import { ViewButton } from "@/components/shared/ViewButton";

import { ShiftDetailModal } from "./ShiftDetailModal";
import { ShiftsCard } from "./ShiftsCard";
import { differenceTextClass } from "./utils/differenceTone";

export function ShiftsList({ shifts, formatCurrency }) {
  const reportsTranslations = useTranslations("reports");
  const [selectedShift, setSelectedShift] = useState(null);

  if (!shifts?.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Clock aria-hidden="true" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">{reportsTranslations("shiftsReport.empty")}</p>
      </div>
    );
  }

  const shiftsColumns = [
    {
      key: "user",
      label: reportsTranslations("shiftsReport.user"),
      render: ({ userName }) => <span className="text-sm font-medium text-deep">{userName}</span>,
    },
    {
      key: "openedAt",
      label: reportsTranslations("shiftsReport.openedAt"),
      render: ({ shiftDate, startTime }) => (
        <span className="text-xs text-gray-500">{shiftDate} {startTime}</span>
      ),
    },
    {
      key: "closedAt",
      label: reportsTranslations("shiftsReport.closedAt"),
      render: ({ shiftDate, endTime }) => (
        <span className="text-xs text-gray-500">{endTime ? `${shiftDate} ${endTime}` : "—"}</span>
      ),
    },
    {
      key: "initialAmount",
      label: reportsTranslations("shiftsReport.initialAmount"),
      render: ({ initialAmount }) => <span className="whitespace-nowrap">{formatCurrency(initialAmount)}</span>,
    },
    {
      key: "finalAmount",
      label: reportsTranslations("shiftsReport.finalAmount"),
      render: ({ finalAmount }) => (
        <span className="whitespace-nowrap">{finalAmount != null ? formatCurrency(finalAmount) : "—"}</span>
      ),
    },
    {
      key: "difference",
      label: reportsTranslations("shiftsReport.difference"),
      render: ({ difference: shiftDifference }) => (
        <span className={`whitespace-nowrap font-bold ${differenceTextClass(shiftDifference)}`}>
          {shiftDifference != null ? `${shiftDifference >= 0 ? "+" : ""}${formatCurrency(shiftDifference)}` : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: reportsTranslations("shiftsReport.actions"),
      className: "text-right",
      render: (shift) => (
        <div className="flex justify-end">
          <ViewButton onPress={() => setSelectedShift(shift)}>
            {reportsTranslations("shiftsReport.view")}
          </ViewButton>
        </div>
      ),
    },
  ];

  return (
    <section aria-label={reportsTranslations("shiftsReport.tableAriaLabel")} className="w-full">
      <div className="md:hidden space-y-3">
        {shifts.map((shift) => (
          <ShiftsCard
            key={shift.id}
            shift={shift}
            formatCurrency={formatCurrency}
            onClick={() => setSelectedShift(shift)}
          />
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <DataTable columns={shiftsColumns} items={shifts} getKey={(shift) => shift.id} />
      </div>
      <ShiftDetailModal
        shift={selectedShift}
        formatCurrency={formatCurrency}
        onClose={() => setSelectedShift(null)}
      />
    </section>
  );
}
