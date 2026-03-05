"use client";
import { useMemo, useState } from "react";

import {
  Button,
  Card,
  CardBody,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  NumberInput,
} from "@heroui/react";
import { AlertCircle, Lock, Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { usePrinters } from "@/components/pages/Store/hooks/usePrinter";
import { useShiftTickets } from "@/hooks/turn/useShiftTickets";

export function CloseTurnModal({
  isOpen,
  onClose,
  onConfirm,
  shiftData,
  formatCurrency,
  confirmLoading = false,
}) {
  const [finalAmount, setFinalAmount] = useState(0);
  const [printing, setPrinting] = useState(false);
  const t = useTranslations("reports");
  const ts = useTranslations("shifts");

  const { totalBalance, totalTickets, byPaymentMethod, loading: ticketsLoading } =
    useShiftTickets(isOpen ? shiftData : null);

  const { printTicket, printerConfigs, loadingConfigs } = usePrinters();

  const hasCustomerPrinter = useMemo(() => {
    if (!Array.isArray(printerConfigs)) return false;
    return printerConfigs.some(
      (config) => config?.printerType === "CUSTOMER" && config?.enabled !== false,
    );
  }, [printerConfigs]);

  const handlePrintCorteZ = async () => {
    setPrinting(true);
    try {
      await printTicket({
        templateName: null,
        printerType: "CUSTOMER",
        broadcast: false,
        ticketData: {
          ticketId: `corte-z-${shiftData?.shift_date ?? ""}`,
          tableName: ts("cortezTitle"),
          roomName: "",
          date: new Date().toISOString(),
          items: byPaymentMethod.map(({ name, total }) => ({
            quantity: 1,
            name,
            price: total,
            comments: [],
          })),
          total: totalBalance,
          invoice: null,
        },
      });
    } catch {}
    finally {
      setPrinting(false);
    }
  };

  const shiftPeriod = shiftData
    ? `${shiftData.shift_date} ${shiftData.start_time}`
    : "—";

  const initialAmount = shiftData?.initial_amount ?? 0;
  const expectedTotal = initialAmount + totalBalance;
  const difference = finalAmount - expectedTotal;

  return (
    <Modal isOpen={isOpen} onClose={onClose} backdrop="blur" size="md">
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-red-600" />
            <span>{t("close.modalTitle")}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="text-deep font-medium">{t("close.modalQuestion")}</span>
            </div>

            <NumberInput
              label={ts("finalAmount")}
              startContent={<span className="text-default-400 text-small">$</span>}
              minValue={0}
              value={finalAmount}
              onValueChange={setFinalAmount}
              onChange={(e) => setFinalAmount(parseFloat(e.target.value) || 0)}
              step={0.1}
            />

            {!ticketsLoading && (
              <Card className="border border-default-200 bg-default-50">
                <CardBody className="p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-default-500">{ts("initialAmountLabel")}</span>
                    <span>{formatCurrency(initialAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-default-500">{ts("totalSales")}</span>
                    <span>+ {formatCurrency(totalBalance)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-default-200 pt-1 mt-1">
                    <span>{ts("expectedTotal")}</span>
                    <span>{formatCurrency(expectedTotal)}</span>
                  </div>
                  <div className={`flex justify-between text-sm font-bold pt-1 ${difference < 0 ? "text-red-600" : difference > 0 ? "text-orange-500" : "text-green-600"}`}>
                    <span>{ts("difference")}</span>
                    <span>{difference >= 0 ? "+" : ""}{formatCurrency(difference)}</span>
                  </div>
                </CardBody>
              </Card>
            )}

            <Card className="border border-default-200">
              <CardBody className="p-3 space-y-2">
                <p className="text-sm font-semibold text-deep">{ts("cortezTitle")}</p>
                <div className="flex justify-between text-sm text-forest">
                  <span>{ts("shiftPeriod")}</span>
                  <span className="font-mono text-xs">{shiftPeriod}</span>
                </div>
                {ticketsLoading ? (
                  <p className="text-xs text-default-400">{t("close.confirming")}</p>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-forest">{ts("totalSales")}</span>
                      <span className="font-bold text-green-700">
                        {formatCurrency(totalBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-forest">{ts("totalTickets")}</span>
                      <span className="font-semibold">{totalTickets}</span>
                    </div>
                    {byPaymentMethod.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-default-100">
                        <p className="text-xs text-default-500">{ts("byPaymentMethod")}</p>
                        {byPaymentMethod.map(({ name, total }) => (
                          <div key={name} className="flex justify-between text-xs">
                            <span className="text-default-600">{name}</span>
                            <span>{formatCurrency(total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {!loadingConfigs && hasCustomerPrinter && (
                  <Button
                    size="sm"
                    variant="bordered"
                    startContent={<Printer className="w-4 h-4" />}
                    onPress={handlePrintCorteZ}
                    isLoading={printing}
                    isDisabled={ticketsLoading}
                    className="w-full mt-1"
                  >
                    {ts("printCorteZ")}
                  </Button>
                )}
              </CardBody>
            </Card>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" color="default" onPress={onClose}>
            {t("close.cancel")}
          </Button>
          <Button
            variant="solid"
            color="danger"
            onPress={() => onConfirm(finalAmount, difference)}
            isDisabled={confirmLoading}
            isLoading={confirmLoading}
          >
            <Lock className="w-4 h-4 mr-1" />
            {confirmLoading ? t("close.confirming") : t("close.confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
