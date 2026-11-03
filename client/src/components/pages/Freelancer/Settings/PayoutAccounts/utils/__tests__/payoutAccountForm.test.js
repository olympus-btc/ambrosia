import { EMPTY_PAYOUT_ACCOUNT_FORM, isPayoutAccountFormComplete, toPayoutAccountForm } from "../payoutAccountForm";

const completeBankForm = {
  ...EMPTY_PAYOUT_ACCOUNT_FORM,
  accountHolder: "Alice",
  bankName: "BBVA",
  currencyId: "currency-mxn",
  clabe: "012180001234567890",
};

describe("toPayoutAccountForm", () => {
  it("returns the empty bank form when there is no payout account", () => {
    expect(toPayoutAccountForm(null)).toEqual(EMPTY_PAYOUT_ACCOUNT_FORM);
  });

  it("fills the form with the payout account and replaces null fields with empty values", () => {
    const payoutAccountForm = toPayoutAccountForm({
      id: "payout-account-id",
      type: "lightning",
      lightningAddress: "alice@getalby.com",
      bankName: null,
      createdAt: "2026-10-06",
    });

    expect(payoutAccountForm).toEqual({
      ...EMPTY_PAYOUT_ACCOUNT_FORM,
      id: "payout-account-id",
      type: "lightning",
      lightningAddress: "alice@getalby.com",
    });
  });
});

describe("isPayoutAccountFormComplete", () => {
  it("accepts a lightning account even without an address", () => {
    expect(isPayoutAccountFormComplete({ ...EMPTY_PAYOUT_ACCOUNT_FORM, type: "lightning" })).toBe(true);
  });

  it("accepts a bank account with holder, bank, currency and one account identifier", () => {
    expect(isPayoutAccountFormComplete(completeBankForm)).toBe(true);
    expect(isPayoutAccountFormComplete({ ...completeBankForm, clabe: "", iban: "DE89370400440532013000" })).toBe(true);
    expect(isPayoutAccountFormComplete({ ...completeBankForm, clabe: "", accountNumber: "1234567890" })).toBe(true);
  });

  it.each(["accountHolder", "bankName", "currencyId"])("rejects a bank account without %s", (requiredFieldName) => {
    expect(isPayoutAccountFormComplete({ ...completeBankForm, [requiredFieldName]: " " })).toBe(false);
  });

  it("rejects a bank account without any account identifier", () => {
    expect(isPayoutAccountFormComplete({ ...completeBankForm, clabe: "" })).toBe(false);
  });
});
