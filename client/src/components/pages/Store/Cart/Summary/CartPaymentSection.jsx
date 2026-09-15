import { useMemo, useState } from "react";

import { Button, Select, SelectItem } from "@heroui/react";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSecretsLockSignal } from "@/hooks/useSecretsLockSignal";
import { SecretsUnlockModal } from "@components/shared/SecretsUnlockModal";

import { usePaymentMethods } from "../hooks/usePaymentMethod";

export function CartPaymentSection({
  isPaying,
  isDisabled,
  paymentError,
  onClearPaymentError,
  onPay,
}) {
  const translateCart = useTranslations("cart");
  const secretsEncryptionCardTranslations = useTranslations();
  const { paymentMethods } = usePaymentMethods();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const { secretsLocked } = useSecretsLockSignal({ enabled: true });
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);

  const effectivePaymentMethod = useMemo(() => {
    if (selectedPaymentMethod) return selectedPaymentMethod;
    const bitcoinLightningMethod = paymentMethods.find((method) => method.name === "BTC");
    return bitcoinLightningMethod ? String(bitcoinLightningMethod.id) : "";
  }, [selectedPaymentMethod, paymentMethods]);

  const isBtcLockedAndSelected = secretsLocked && paymentMethods.find(
    (method) => String(method.id) === effectivePaymentMethod,
  )?.name === "BTC";

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
        color={isBtcLockedAndSelected ? "danger" : "primary"}
        className="w-full"
        size="lg"
        isLoading={isPaying}
        isDisabled={isDisabled}
        startContent={isBtcLockedAndSelected ? <Lock className="w-4 h-4" /> : undefined}
        onPress={isBtcLockedAndSelected ? () => setUnlockModalOpen(true) : () => onPay(effectivePaymentMethod)}
      >
        {isBtcLockedAndSelected
          ? secretsEncryptionCardTranslations("secretsEncryptionCard.unlockButton")
          : translateCart("summary.pay")}
      </Button>
      {unlockModalOpen && <SecretsUnlockModal onClose={() => setUnlockModalOpen(false)} />}
    </div>
  );
}
