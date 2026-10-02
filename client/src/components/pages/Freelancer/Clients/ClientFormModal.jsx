"use client";

import { useRef, useState } from "react";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  NumberInput,
  Select,
  SelectItem,
} from "@heroui/react";
import { useTranslations } from "next-intl";

const BILLING_CYCLES = ["weekly", "biweekly", "monthly"];
const PAYMENT_METHODS = ["bank", "lightning"];

function getPayoutAccountLabel(payoutAccount, clientTranslations) {
  if (payoutAccount.type === "lightning") {
    return payoutAccount.lightningAddress || clientTranslations("modal.payoutAccountLightningFallback");
  }

  return [
    payoutAccount.bankName,
    payoutAccount.accountHolder,
    payoutAccount.accountNumber || payoutAccount.clabe || payoutAccount.iban,
  ].filter(Boolean).join(" - ");
}

export function ClientFormModal({
  clientForm,
  currencies,
  isOpen,
  mode,
  onChange,
  onClose,
  onSubmit,
  payoutAccounts,
}) {
  const clientTranslations = useTranslations("freelanceClients");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const isEditMode = mode === "edit";

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    try {
      setIsSubmitting(true);
      await onSubmit(clientForm);
      onClose();
    } catch {
      return;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(nextOpenState) => {
        if (!nextOpenState) onClose();
      }}
      placement="center"
      backdrop="blur"
      shouldBlockScroll={false}
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
      }}
    >
      <ModalContent>
        <ModalHeader>
          {isEditMode ? clientTranslations("modal.titleEdit") : clientTranslations("modal.titleAdd")}
        </ModalHeader>
        <ModalBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label={clientTranslations("modal.nameLabel")}
              placeholder={clientTranslations("modal.namePlaceholder")}
              value={clientForm.name}
              isRequired
              errorMessage={clientTranslations("modal.nameError")}
              onChange={(nameChangeEvent) => onChange({ name: nameChangeEvent.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label={clientTranslations("modal.currencyLabel")}
                selectedKeys={clientForm.currencyId ? [clientForm.currencyId] : []}
                isRequired
                onSelectionChange={(selectedCurrencyKeys) => {
                  const selectedCurrencyId = Array.from(selectedCurrencyKeys)[0] || "";
                  onChange({ currencyId: selectedCurrencyId });
                }}
              >
                {currencies.map((currency) => (
                  <SelectItem key={currency.id}>
                    {currency.name ? `${currency.acronym} - ${currency.name}` : currency.acronym}
                  </SelectItem>
                ))}
              </Select>

              <NumberInput
                label={clientTranslations("modal.hourlyRateLabel")}
                minValue={0}
                step={0.01}
                value={clientForm.hourlyRateCents / 100}
                isRequired
                onValueChange={(hourlyRateValue) => {
                  onChange({ hourlyRateCents: Math.round((hourlyRateValue || 0) * 100) });
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label={clientTranslations("modal.billingCycleLabel")}
                selectedKeys={clientForm.billingCycle ? [clientForm.billingCycle] : []}
                isRequired
                onSelectionChange={(selectedBillingCycleKeys) => {
                  const selectedBillingCycle = Array.from(selectedBillingCycleKeys)[0] || "";
                  onChange({ billingCycle: selectedBillingCycle });
                }}
              >
                {BILLING_CYCLES.map((billingCycle) => (
                  <SelectItem key={billingCycle}>
                    {clientTranslations(`billingCycles.${billingCycle}`)}
                  </SelectItem>
                ))}
              </Select>

              <Select
                label={clientTranslations("modal.paymentMethodLabel")}
                selectedKeys={clientForm.paymentMethod ? [clientForm.paymentMethod] : []}
                isRequired
                onSelectionChange={(selectedPaymentMethodKeys) => {
                  const selectedPaymentMethod = Array.from(selectedPaymentMethodKeys)[0] || "";
                  onChange({ paymentMethod: selectedPaymentMethod });
                }}
              >
                {PAYMENT_METHODS.map((paymentMethod) => (
                  <SelectItem key={paymentMethod}>
                    {clientTranslations(`paymentMethods.${paymentMethod}`)}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <Select
              label={clientTranslations("modal.payoutAccountLabel")}
              selectedKeys={[clientForm.payoutAccountId || "none"]}
              onSelectionChange={(selectedPayoutAccountKeys) => {
                const selectedPayoutAccountId = Array.from(selectedPayoutAccountKeys)[0];
                onChange({ payoutAccountId: selectedPayoutAccountId === "none" ? null : selectedPayoutAccountId });
              }}
            >
              <SelectItem key="none">{clientTranslations("modal.noPayoutAccount")}</SelectItem>
              {payoutAccounts.map((payoutAccount) => (
                <SelectItem key={payoutAccount.id}>
                  {getPayoutAccountLabel(payoutAccount, clientTranslations)}
                </SelectItem>
              ))}
            </Select>

            <ModalFooter className="flex justify-between p-0 my-4">
              <Button
                variant="bordered"
                type="button"
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onPress={onClose}
                isDisabled={isSubmitting}
              >
                {clientTranslations("modal.cancelButton")}
              </Button>
              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
                isDisabled={isSubmitting}
                isLoading={isSubmitting}
              >
                {isEditMode ? clientTranslations("modal.editButton") : clientTranslations("modal.submitButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
