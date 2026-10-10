"use client";
import { useCallback, useEffect, useState } from "react";

import { Modal, ModalBody, ModalContent, ModalHeader, Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

import { usePaymentMethodLabel } from "@/hooks/usePaymentMethodLabel";
import { getShiftBreakdown } from "@/services/shiftsService";

import { differenceTextClass } from "./utils/differenceTone";

export function ShiftDetailModal({ shift, formatCurrency, onClose }) {
  const reportsTranslations = useTranslations("reports");
  const shiftTranslations = useTranslations("shifts");
  const { getPaymentMethodLabel } = usePaymentMethodLabel();
  const [shiftBreakdown, setShiftBreakdown] = useState(null);
  const [isLoadingShiftBreakdown, setIsLoadingShiftBreakdown] = useState(false);
  const [error, setError] = useState(false);

  const fetchShiftBreakdown = useCallback(async () => {
    if (!shift?.id) return;

    setIsLoadingShiftBreakdown(true);
    setError(false);
    try {
      const fetchedShiftBreakdown = await getShiftBreakdown(shift.id);
      setShiftBreakdown(fetchedShiftBreakdown);
    } catch {
      setError(true);
    } finally {
      setIsLoadingShiftBreakdown(false);
    }
  }, [shift?.id]);

  useEffect(() => {
    fetchShiftBreakdown();
  }, [fetchShiftBreakdown]);

  const shiftPeriod = shift
    ? `${shift.shiftDate} ${shift.startTime}${shift.endTime ? ` – ${shift.endTime}` : ""}`
    : "—";

  return (
    <Modal
      isOpen={Boolean(shift)}
      onClose={onClose}
      size="md"
      scrollBehavior="inside"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        base: "my-auto",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-0.5 pb-2">
          <span>{reportsTranslations("shiftsReport.detailTitle")}</span>
          {shift && <span className="text-sm font-normal text-gray-400">{shift.userName}</span>}
        </ModalHeader>
        <ModalBody className="pb-6">
          {shift && (
            <div className="space-y-4">
              {isLoadingShiftBreakdown && (
                <div className="flex justify-center py-8">
                  <Spinner size="sm" />
                </div>
              )}

              {!isLoadingShiftBreakdown && error && (
                <p className="text-sm text-red-600 text-center py-4">{shiftTranslations("loadError")}</p>
              )}

              {!isLoadingShiftBreakdown && !error && shiftBreakdown && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">{shiftTranslations("shiftPeriod")}</p>
                      <p className="font-medium">{shiftPeriod}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{shiftTranslations("initialAmountLabel")}</p>
                      <p className="font-medium">{formatCurrency(shiftBreakdown.initialAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{shiftTranslations("totalTickets")}</p>
                      <p className="font-medium">{shiftBreakdown.totalTickets}</p>
                    </div>
                    {shiftBreakdown.totalTips > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{shiftTranslations("totalTips")}</p>
                        <p className="font-medium">{formatCurrency(shiftBreakdown.totalTips)}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">{shiftTranslations("totalSales")}</span>
                      <span className="font-medium">{formatCurrency(shiftBreakdown.totalSales)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">{shiftTranslations("cashSales")}</span>
                      <span className="font-medium">{formatCurrency(shiftBreakdown.cashSales)}</span>
                    </div>
                    {shiftBreakdown.cashRefunds > 0 && (
                      <div className="flex justify-between items-center text-sm text-red-600">
                        <span>{shiftTranslations("cashRefunds")}</span>
                        <span>-{formatCurrency(shiftBreakdown.cashRefunds)}</span>
                      </div>
                    )}
                  </div>

                  {shiftBreakdown.byPaymentMethod.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <p className="text-xs text-gray-400">{shiftTranslations("byPaymentMethod")}</p>
                      {shiftBreakdown.byPaymentMethod.map(({ name, total }) => (
                        <div key={name} className="flex justify-between items-center text-sm">
                          <span>{getPaymentMethodLabel(name)}</span>
                          <span className="font-medium">{formatCurrency(total)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                    <span className="font-semibold text-sm">{shiftTranslations("expectedTotal")}</span>
                    <span className="font-bold text-green-700">{formatCurrency(shiftBreakdown.expectedTotal)}</span>
                  </div>

                  {shiftBreakdown.finalAmount != null && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">{shiftTranslations("finalAmount")}</span>
                      <span className="font-medium">{formatCurrency(shiftBreakdown.finalAmount)}</span>
                    </div>
                  )}

                  {shiftBreakdown.difference != null && (
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">{shiftTranslations("difference")}</span>
                      <span className={`font-bold ${differenceTextClass(shiftBreakdown.difference)}`}>
                        {shiftBreakdown.difference >= 0 ? "+" : ""}
                        {formatCurrency(shiftBreakdown.difference)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
