import { getPaymentErrorDescription } from "../paymentErrors";

const translate = (key) => key;

describe("getPaymentErrorDescription", () => {
  it("returns the secrets-locked message when the error status is 409", () => {
    expect(getPaymentErrorDescription(translate, { status: 409 })).toBe(
      "payments.send.errors.secretsLocked",
    );
  });

  it("falls back to the code-specific translation for a non-409 error", () => {
    expect(getPaymentErrorDescription(translate, { code: "invoice_expired" })).toBe(
      "payments.send.errors.invoiceExpired",
    );
  });
});
