"use client";

import { Input } from "@heroui/react";
import { useTranslations } from "next-intl";

export function PayoutAccountTextField({ fieldName, payoutAccountForm, onFieldChange, isRequired = false, description }) {
  const payoutAccountsTranslations = useTranslations("freelancerSettings.payoutAccounts");

  return (
    <Input
      label={payoutAccountsTranslations(`fields.${fieldName}`)}
      type="text"
      placeholder={payoutAccountsTranslations(`placeholders.${fieldName}`)}
      isRequired={isRequired}
      description={description}
      value={payoutAccountForm[fieldName]}
      onChange={(changeEvent) => onFieldChange(fieldName, changeEvent.target.value)}
    />
  );
}
