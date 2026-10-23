"use client";

import { useCallback, useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useHasCustomerPrinter } from "@/components/pages/Store/hooks/useHasCustomerPrinter";
import { usePermission } from "@/hooks/usePermission";
import { useShiftReportLabels } from "@/hooks/useShiftReportLabels";
import { printShiftReport } from "@/services/shiftsService";

export function useShiftReportReprint(shift) {
  const shiftTranslations = useTranslations("shifts");
  const shiftReportLabels = useShiftReportLabels();
  const canPrintShiftReport = usePermission({ allOf: ["shifts_create"] });
  const { hasCustomerPrinter, loadingConfigs } = useHasCustomerPrinter();
  const [isReprinting, setIsReprinting] = useState(false);

  const canReprint = Boolean(shift?.id && shift.endTime && canPrintShiftReport && !loadingConfigs && hasCustomerPrinter);

  const reprintShiftReport = useCallback(async () => {
    if (!canReprint) return;
    setIsReprinting(true);
    try {
      await printShiftReport(shift.id, shiftReportLabels);
      addToast({ color: "success", description: shiftTranslations("printCorteZSuccess") });
    } catch (printShiftReportError) {
      console.error("Error reprinting shift report:", printShiftReportError);
      addToast({ color: "danger", description: shiftTranslations("printCorteZError") });
    } finally {
      setIsReprinting(false);
    }
  }, [canReprint, shift, shiftReportLabels, shiftTranslations]);

  return { canReprint, isReprinting, reprintShiftReport };
}
