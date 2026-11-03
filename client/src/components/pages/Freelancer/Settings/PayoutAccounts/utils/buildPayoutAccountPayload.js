import { PAYOUT_ACCOUNT_TYPE } from "./payoutAccountForm";

function toNullableTrimmedValue(fieldValue) {
  const trimmedValue = fieldValue?.trim();
  return trimmedValue ? trimmedValue : null;
}

export function buildPayoutAccountPayload(payoutAccountForm) {
  if (payoutAccountForm.type === PAYOUT_ACCOUNT_TYPE.LIGHTNING) {
    return {
      type: PAYOUT_ACCOUNT_TYPE.LIGHTNING,
      lightningAddress: toNullableTrimmedValue(payoutAccountForm.lightningAddress),
    };
  }

  return {
    type: PAYOUT_ACCOUNT_TYPE.BANK,
    accountHolder: toNullableTrimmedValue(payoutAccountForm.accountHolder),
    bankName: toNullableTrimmedValue(payoutAccountForm.bankName),
    accountNumber: toNullableTrimmedValue(payoutAccountForm.accountNumber),
    currencyId: toNullableTrimmedValue(payoutAccountForm.currencyId),
    swift: toNullableTrimmedValue(payoutAccountForm.swift),
    iban: toNullableTrimmedValue(payoutAccountForm.iban),
    clabe: toNullableTrimmedValue(payoutAccountForm.clabe),
    lightningAddress: null,
  };
}
