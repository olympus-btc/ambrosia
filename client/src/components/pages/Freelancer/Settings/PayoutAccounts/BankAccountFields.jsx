"use client";

import { useTranslations } from "next-intl";

import { CurrencyInput } from "@components/shared/CurrencyInput";

import { PayoutAccountTextField } from "./PayoutAccountTextField";

const REQUIRED_BANK_FIELD_NAMES = ["accountHolder", "bankName"];
const BANK_DETAIL_FIELDS = [
  { fieldName: "accountNumber", showsBankIdentifierHelp: true },
  { fieldName: "clabe", showsBankIdentifierHelp: false },
  { fieldName: "iban", showsBankIdentifierHelp: false },
  { fieldName: "swift", showsBankIdentifierHelp: false },
];

export function BankAccountFields({ payoutAccountForm, currencies, onFieldChange }) {
  const payoutAccountsTranslations = useTranslations("freelancerSettings.payoutAccounts");
  const currencyOptions = currencies.map((currency) => ({ code: currency.acronym, name: currency.name ?? currency.acronym }));
  const selectedCurrencyAcronym = currencies.find((currency) => currency.id === payoutAccountForm.currencyId)?.acronym ?? null;

  const changeSelectedCurrency = (currencyAcronym) => {
    const selectedCurrency = currencies.find((currency) => currency.acronym === currencyAcronym);
    onFieldChange("currencyId", selectedCurrency?.id ?? "");
  };

  return (
    <>
      {REQUIRED_BANK_FIELD_NAMES.map((requiredBankFieldName) => (
        <PayoutAccountTextField
          key={requiredBankFieldName}
          fieldName={requiredBankFieldName}
          payoutAccountForm={payoutAccountForm}
          onFieldChange={onFieldChange}
          isRequired
        />
      ))}
      <CurrencyInput
        currencies={currencyOptions}
        label={payoutAccountsTranslations("fields.currency")}
        placeholder={payoutAccountsTranslations("placeholders.currency")}
        isRequired
        selectedKey={selectedCurrencyAcronym}
        onSelectionChange={changeSelectedCurrency}
      />
      {BANK_DETAIL_FIELDS.map((bankDetailField) => (
        <PayoutAccountTextField
          key={bankDetailField.fieldName}
          fieldName={bankDetailField.fieldName}
          payoutAccountForm={payoutAccountForm}
          onFieldChange={onFieldChange}
          description={bankDetailField.showsBankIdentifierHelp ? payoutAccountsTranslations("bankIdentifierHelp") : undefined}
        />
      ))}
    </>
  );
}
