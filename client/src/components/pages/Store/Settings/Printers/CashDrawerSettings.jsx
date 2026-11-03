"use client";

import { useState } from "react";

import { addToast, Button, Checkbox, CheckboxGroup, Select, SelectItem, Switch } from "@heroui/react";
import { useTranslations } from "next-intl";

import { classifyPaymentMethod, PAYMENT_METHODS } from "@/components/pages/Store/Cart/utils/paymentMethods";
import { useCashDrawer } from "@/hooks/useCashDrawer";
import { usePaymentMethodLabel } from "@/hooks/usePaymentMethodLabel";
import { RequirePermission } from "@/hooks/usePermission";

const CASH_DRAWER_PINS = ["PIN_2", "PIN_5"];

const CASH_DRAWER_TRIGGERS = [
  { configKey: "openCashDrawerOnRefund", labelKey: "openOnRefund" },
  { configKey: "openCashDrawerOnShiftOpen", labelKey: "openOnShiftOpen" },
  { configKey: "openCashDrawerOnShiftClose", labelKey: "openOnShiftClose" },
];

function findCashPaymentMethodIds(paymentMethods) {
  return paymentMethods
    .filter((paymentMethod) => classifyPaymentMethod(paymentMethod.name) === PAYMENT_METHODS.CASH)
    .map((paymentMethod) => paymentMethod.id);
}

export function CashDrawerSettings({ printerConfig, paymentMethods, onCashDrawerChange }) {
  const settingsTranslations = useTranslations("settings");
  const { getPaymentMethodLabel } = usePaymentMethodLabel();
  const { openCashDrawer } = useCashDrawer();
  const [testingCashDrawer, setTestingCashDrawer] = useState(false);
  const cashDrawerPaymentMethodIds = printerConfig.cashDrawerPaymentMethodIds ?? [];

  const testCashDrawer = async () => {
    if (testingCashDrawer) return;
    setTestingCashDrawer(true);
    try {
      await openCashDrawer(printerConfig.id);
      addToast({ color: "success", description: settingsTranslations("cardPrinters.cashDrawer.testSuccess") });
    } catch {
      addToast({ color: "danger", description: settingsTranslations("cardPrinters.cashDrawer.testError") });
    } finally {
      setTestingCashDrawer(false);
    }
  };

  const toggleCashDrawer = (cashDrawerEnabled) => {
    if (cashDrawerEnabled && cashDrawerPaymentMethodIds.length === 0) {
      onCashDrawerChange({ cashDrawerEnabled, cashDrawerPaymentMethodIds: findCashPaymentMethodIds(paymentMethods) });
      return;
    }
    onCashDrawerChange({ cashDrawerEnabled });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
      <Switch size="sm" isSelected={printerConfig.cashDrawerEnabled} onValueChange={toggleCashDrawer}>
        <span className="text-xs sm:text-sm">{settingsTranslations("cardPrinters.cashDrawer.enabledLabel")}</span>
      </Switch>

      {printerConfig.cashDrawerEnabled && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <Select
              className="w-full sm:max-w-xs"
              label={settingsTranslations("cardPrinters.cashDrawer.pinLabel")}
              description={settingsTranslations("cardPrinters.cashDrawer.pinDescription")}
              selectedKeys={[printerConfig.cashDrawerPin ?? "PIN_2"]}
              onChange={(pinChangeEvent) => pinChangeEvent.target.value && onCashDrawerChange({ cashDrawerPin: pinChangeEvent.target.value })}
            >
              {CASH_DRAWER_PINS.map((cashDrawerPin) => (
                <SelectItem key={cashDrawerPin} value={cashDrawerPin}>
                  {settingsTranslations(`cardPrinters.cashDrawer.pins.${cashDrawerPin}`)}
                </SelectItem>
              ))}
            </Select>
            <RequirePermission allOf={["cash_drawer_open"]}>
              <Button
                variant="bordered"
                className="h-14 shrink-0"
                onPress={testCashDrawer}
                isLoading={testingCashDrawer}
              >
                {settingsTranslations("cardPrinters.cashDrawer.testButton")}
              </Button>
            </RequirePermission>
          </div>

          <CheckboxGroup
            size="sm"
            label={settingsTranslations("cardPrinters.cashDrawer.paymentMethodsLabel")}
            description={settingsTranslations("cardPrinters.cashDrawer.paymentMethodsDescription")}
            value={cashDrawerPaymentMethodIds}
            onValueChange={(selectedPaymentMethodIds) => onCashDrawerChange({ cashDrawerPaymentMethodIds: selectedPaymentMethodIds })}
          >
            {paymentMethods.map((paymentMethod) => (
              <Checkbox key={paymentMethod.id} value={paymentMethod.id}>
                {getPaymentMethodLabel(paymentMethod.name)}
              </Checkbox>
            ))}
          </CheckboxGroup>

          <div className="flex flex-col gap-2">
            {CASH_DRAWER_TRIGGERS.map(({ configKey, labelKey }) => (
              <Switch
                key={configKey}
                size="sm"
                isSelected={printerConfig[configKey] ?? true}
                onValueChange={(isTriggerSelected) => onCashDrawerChange({ [configKey]: isTriggerSelected })}
              >
                <span className="text-xs sm:text-sm">{settingsTranslations(`cardPrinters.cashDrawer.${labelKey}`)}</span>
              </Switch>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
