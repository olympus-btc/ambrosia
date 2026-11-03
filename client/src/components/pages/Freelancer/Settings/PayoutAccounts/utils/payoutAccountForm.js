export const PAYOUT_ACCOUNT_TYPE = {
  BANK: "bank",
  LIGHTNING: "lightning",
};

export const PAYOUT_ACCOUNT_TYPES = [PAYOUT_ACCOUNT_TYPE.BANK, PAYOUT_ACCOUNT_TYPE.LIGHTNING];

export const BANK_IDENTIFIER_FIELD_NAMES = ["accountNumber", "clabe", "iban"];

export const EMPTY_PAYOUT_ACCOUNT_FORM = {
  id: null,
  type: PAYOUT_ACCOUNT_TYPE.BANK,
  accountHolder: "",
  bankName: "",
  accountNumber: "",
  currencyId: "",
  swift: "",
  iban: "",
  clabe: "",
  lightningAddress: "",
};

export function toPayoutAccountForm(payoutAccount) {
  if (!payoutAccount) return EMPTY_PAYOUT_ACCOUNT_FORM;
  return {
    id: payoutAccount.id ?? null,
    type: payoutAccount.type ?? EMPTY_PAYOUT_ACCOUNT_FORM.type,
    accountHolder: payoutAccount.accountHolder ?? "",
    bankName: payoutAccount.bankName ?? "",
    accountNumber: payoutAccount.accountNumber ?? "",
    currencyId: payoutAccount.currencyId ?? "",
    swift: payoutAccount.swift ?? "",
    iban: payoutAccount.iban ?? "",
    clabe: payoutAccount.clabe ?? "",
    lightningAddress: payoutAccount.lightningAddress ?? "",
  };
}

function hasText(fieldValue) {
  return Boolean(fieldValue?.trim());
}

export function isPayoutAccountFormComplete(payoutAccountForm) {
  if (payoutAccountForm.type === PAYOUT_ACCOUNT_TYPE.LIGHTNING) return true;
  const hasBankIdentifier = BANK_IDENTIFIER_FIELD_NAMES.some((bankIdentifierFieldName) => hasText(payoutAccountForm[bankIdentifierFieldName]));
  return hasText(payoutAccountForm.accountHolder)
    && hasText(payoutAccountForm.bankName)
    && hasText(payoutAccountForm.currencyId)
    && hasBankIdentifier;
}
