"use client";
import { useState } from "react";

import { Button, Card, CardBody } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { CloseTurnModal } from "@/components/turn/CloseTurnModal";
import { useTurn } from "@/hooks/turn/useTurn";

export function ShiftWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingTurn, setClosingTurn] = useState(false);

  const shiftTranslations = useTranslations("shifts");
  const { openTurn, openShiftData, closeShift, totalBalance, totalTickets, ticketsLoading } = useTurn();
  const { formatAmount } = useCurrency();

  if (openTurn === null) return null;

  const formatCurrency = (amount) => formatAmount(Math.round(amount * 100));

  const handleConfirmClose = async (finalAmount, difference) => {
    setClosingTurn(true);
    await closeShift(finalAmount, difference);
    setClosingTurn(false);
    setShowCloseModal(false);
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-16 right-0 w-[calc(100vw-2rem)] max-w-72"
          >
            <Card shadow="lg" className="rounded-lg">
              <CardBody className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-deep">{shiftTranslations("shiftActive")}</span>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-default-400 hover:text-default-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-default-500 font-mono">
                  {shiftTranslations("shiftOpenedAt")}: {openShiftData?.shiftDate} {openShiftData?.startTime}
                </p>

                <div className="space-y-1 border-t border-default-100 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-default-500">{shiftTranslations("totalSales")}</span>
                    <span className="font-semibold text-green-700">
                      {ticketsLoading ? "…" : formatCurrency(totalBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-default-500">{shiftTranslations("totalTickets")}</span>
                    <span className="font-semibold">
                      {ticketsLoading ? "…" : totalTickets}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-default-500">{shiftTranslations("initialAmountLabel")}</span>
                    <span>{formatCurrency(openShiftData?.initialAmount ?? 0)}</span>
                  </div>
                </div>

                <Button
                  color="danger"
                  onPress={() => setShowCloseModal(true)}
                >
                  {shiftTranslations("closeShiftButton")}
                </Button>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-gray-800 shadow-lg hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        {shiftTranslations("shiftActive")}
        <Clock className="w-4 h-4" />
      </button>

      <CloseTurnModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={handleConfirmClose}
        shiftData={openShiftData}
        formatCurrency={formatCurrency}
        confirmLoading={closingTurn}
      />
    </div>
  );
}
