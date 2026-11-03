"use client";

import { useEffect, useState } from "react";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

import { BankAccountFields } from "./BankAccountFields";
import { PayoutAccountTextField } from "./PayoutAccountTextField";
import {
  isPayoutAccountFormComplete,
  PAYOUT_ACCOUNT_TYPE,
  PAYOUT_ACCOUNT_TYPES,
  toPayoutAccountForm,
} from "./utils/payoutAccountForm";

export function PayoutAccountModal({ payoutAccount, currencies, isOpen, onClose, onSave }) {
  const payoutAccountsTranslations = useTranslations("freelancerSettings.payoutAccounts");
  const [payoutAccountForm, setPayoutAccountForm] = useState(() => toPayoutAccountForm(payoutAccount));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setPayoutAccountForm(toPayoutAccountForm(payoutAccount));
  }, [isOpen, payoutAccount]);

  const isEditing = Boolean(payoutAccount?.id);
  const isBankAccount = payoutAccountForm.type === PAYOUT_ACCOUNT_TYPE.BANK;

  const changePayoutAccountField = (fieldName, fieldValue) => {
    setPayoutAccountForm((previousForm) => ({ ...previousForm, [fieldName]: fieldValue }));
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!isPayoutAccountFormComplete(payoutAccountForm)) return;
    setIsSaving(true);
    try {
      await onSave(payoutAccountForm);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => !nextIsOpen && onClose()}
      placement="center"
      backdrop="blur"
      shouldBlockScroll={false}
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
        body: "overflow-y-auto max-h-[65vh]",
      }}
    >
      <ModalContent>
        <ModalHeader>
          {payoutAccountsTranslations(isEditing ? "modal.editTitle" : "modal.createTitle")}
        </ModalHeader>
        <ModalBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Select
              label={payoutAccountsTranslations("fields.type")}
              isRequired
              selectedKeys={[payoutAccountForm.type]}
              disallowEmptySelection
              onChange={(changeEvent) => changePayoutAccountField("type", changeEvent.target.value)}
            >
              {PAYOUT_ACCOUNT_TYPES.map((payoutAccountType) => (
                <SelectItem key={payoutAccountType}>
                  {payoutAccountsTranslations(`types.${payoutAccountType}`)}
                </SelectItem>
              ))}
            </Select>

            {isBankAccount ? (
              <BankAccountFields
                payoutAccountForm={payoutAccountForm}
                currencies={currencies}
                onFieldChange={changePayoutAccountField}
              />
            ) : (
              <PayoutAccountTextField
                fieldName="lightningAddress"
                payoutAccountForm={payoutAccountForm}
                onFieldChange={changePayoutAccountField}
                description={payoutAccountsTranslations("lightningAddressHelp")}
              />
            )}

            <ModalFooter className="flex justify-between p-0 my-4">
              <Button
                variant="bordered"
                type="button"
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onPress={onClose}
              >
                {payoutAccountsTranslations("modal.cancelButton")}
              </Button>
              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
                isLoading={isSaving}
                isDisabled={!isPayoutAccountFormComplete(payoutAccountForm) || isSaving}
              >
                {payoutAccountsTranslations("modal.saveButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
