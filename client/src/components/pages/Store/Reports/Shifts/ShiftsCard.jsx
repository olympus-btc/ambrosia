"use client";

import { Card, CardBody } from "@heroui/react";
import { User } from "lucide-react";
import { useTranslations } from "next-intl";

import { ViewButton } from "@/components/shared/ViewButton";

import { differenceTextClass } from "./utils/differenceTone";

export function ShiftsCard({ shift, formatCurrency, onClick }) {
  const reportsTranslations = useTranslations("reports");
  const { userName, shiftDate, startTime, endTime, initialAmount, finalAmount, difference } = shift;

  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody>
        <div className="flex items-center gap-1 text-sm text-forest">
          <User aria-hidden="true" className="w-3 h-3 shrink-0" />
          <span className="truncate font-bold text-deep">{userName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-gray-400">
          <span>{reportsTranslations("shiftsReport.openedAt")}: {shiftDate} {startTime}</span>
          <span>{reportsTranslations("shiftsReport.closedAt")}: {endTime ? `${shiftDate} ${endTime}` : "—"}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mt-2 text-sm">
          <span className="text-gray-500">{reportsTranslations("shiftsReport.initialAmount")}</span>
          <span>{formatCurrency(initialAmount)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
          <span className="text-gray-500">{reportsTranslations("shiftsReport.finalAmount")}</span>
          <span>{finalAmount != null ? formatCurrency(finalAmount) : "—"}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm font-bold">
          <span className="text-gray-500 font-normal">{reportsTranslations("shiftsReport.difference")}</span>
          <span className={differenceTextClass(difference)}>
            {difference != null ? `${difference >= 0 ? "+" : ""}${formatCurrency(difference)}` : "—"}
          </span>
        </div>
        <div className="flex justify-end mt-2">
          <ViewButton onPress={onClick}>{reportsTranslations("shiftsReport.view")}</ViewButton>
        </div>
      </CardBody>
    </Card>
  );
}
