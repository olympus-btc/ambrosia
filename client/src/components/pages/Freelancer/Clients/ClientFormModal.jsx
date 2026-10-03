"use client";

import { useRef, useState } from "react";

import {
  Button,
  Chip,
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

export function ClientFormModal({
  clientForm,
  currencies,
  isOpen,
  mode,
  onChange,
  onClose,
  onSubmit,
}) {
  const clientTranslations = useTranslations("freelanceClients");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const isSubmittingRef = useRef(false);
  const isEditMode = mode === "edit";
  const availablePaymentMethods = PAYMENT_METHODS.filter(
    (paymentMethod) => !clientForm.paymentMethods.includes(paymentMethod),
  );

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isSubmittingRef.current || clientForm.paymentMethods.length === 0) return;

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

  const handleAddPaymentMethod = () => {
    if (!selectedPaymentMethod || clientForm.paymentMethods.includes(selectedPaymentMethod)) return;
    onChange({ paymentMethods: [...clientForm.paymentMethods, selectedPaymentMethod] });
    setSelectedPaymentMethod("");
  };

  const handleRemovePaymentMethod = (paymentMethodToRemove) => {
    onChange({
      paymentMethods: clientForm.paymentMethods.filter((paymentMethod) => paymentMethod !== paymentMethodToRemove),
    });
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
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <Select
                  label={clientTranslations("modal.paymentMethodsLabel")}
                  selectedKeys={selectedPaymentMethod ? [selectedPaymentMethod] : []}
                  errorMessage={clientTranslations("modal.paymentMethodsError")}
                  isInvalid={clientForm.paymentMethods.length === 0}
                  className="sm:flex-1"
                  onSelectionChange={(selectedPaymentMethodKeys) => {
                    const selectedPaymentMethodKey = Array.from(selectedPaymentMethodKeys)[0] || "";
                    setSelectedPaymentMethod(selectedPaymentMethodKey);
                  }}
                >
                  {availablePaymentMethods.map((paymentMethod) => (
                    <SelectItem key={paymentMethod}>
                      {clientTranslations(`paymentMethods.${paymentMethod}`)}
                    </SelectItem>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="flat"
                  className="h-14 sm:min-w-24"
                  onPress={handleAddPaymentMethod}
                  isDisabled={!selectedPaymentMethod}
                >
                  {clientTranslations("modal.addPaymentMethodButton")}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {clientForm.paymentMethods.map((paymentMethod) => (
                  <Chip
                    key={paymentMethod}
                    variant="flat"
                    className="bg-green-200 text-xs text-green-800 border border-green-300"
                    classNames={{
                      closeButton: "text-red-600 hover:text-red-700",
                    }}
                    onClose={() => handleRemovePaymentMethod(paymentMethod)}
                  >
                    {clientTranslations(`paymentMethods.${paymentMethod}`)}
                  </Chip>
                ))}
              </div>
            </div>

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
                isDisabled={isSubmitting || clientForm.paymentMethods.length === 0}
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
