import { useMemo, useState } from "react";

import { Button, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

import { usePaymentMethods } from "../hooks/usePaymentMethod";

export function CartPaymentSection({
  isPaying,
  isDisabled,
  paymentError,
  onClearPaymentError,
  onPay,
}) {
  const translateCart = useTranslations("cart");
  const { paymentMethods } = usePaymentMethods();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");

  const effectivePaymentMethod = useMemo(() => {
    if (selectedPaymentMethod) return selectedPaymentMethod;
    const bitcoinLightningMethod = paymentMethods.find((method) => method.name === "BTC");
    return bitcoinLightningMethod ? String(bitcoinLightningMethod.id) : "";
  }, [selectedPaymentMethod, paymentMethods]);

  return (
    <div className="space-y-2">
      {paymentError && (
        <p className="text-sm text-red-600">{paymentError}</p>
      )}
      <Select
        label={translateCart("summary.paymentMethodLabel")}
        placeholder={translateCart("summary.paymentMethodSelectPlaceholder")}
        isRequired
        errorMessage={translateCart("summary.errorMsgSelectEmpty")}
        selectedKeys={effectivePaymentMethod ? [effectivePaymentMethod] : []}
        onSelectionChange={(keys) => {
          const value = Array.from(keys)[0];
          if (!value) return;
          setSelectedPaymentMethod(value);
          onClearPaymentError?.();
        }}
        isDisabled={isPaying}
      >
        {paymentMethods.map((method) => (
          <SelectItem key={method.id} value={method.id}>
            {method.name === "BTC" ? `${method.name} (Lightning)` : method.name}
          </SelectItem>
        ))}
      </Select>
      <Button
        color="primary"
        className="w-full"
        size="lg"
        isLoading={isPaying}
        isDisabled={isDisabled}
        onPress={() => onPay(effectivePaymentMethod)}
      >
        {translateCart("summary.pay")}
      </Button>
    </div>
  );
}
