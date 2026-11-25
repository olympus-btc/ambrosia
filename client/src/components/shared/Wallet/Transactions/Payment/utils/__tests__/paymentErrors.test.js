import { getPaymentErrorDescription } from "../paymentErrors";

const errorsTranslations = (translationKey) => translationKey;

describe("getPaymentErrorDescription", () => {
  it("returns the secrets-locked message when the error status is 409", () => {
    expect(getPaymentErrorDescription(errorsTranslations, { status: 409 })).toBe(
      "payments.send.errors.secretsLocked",
    );
  });

  it("falls back to the code-specific translation for a non-409 error", () => {
    expect(getPaymentErrorDescription(errorsTranslations, { code: "invoice_expired" })).toBe(
      "payments.send.errors.invoiceExpired",
    );
  });
});
