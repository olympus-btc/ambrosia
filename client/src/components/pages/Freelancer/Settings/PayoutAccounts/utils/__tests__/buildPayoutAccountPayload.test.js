import { buildPayoutAccountPayload } from "../buildPayoutAccountPayload";

describe("buildPayoutAccountPayload", () => {
  it("sends only the trimmed lightning address for a lightning account", () => {
    const lightningPayload = buildPayoutAccountPayload({
      type: "lightning",
      accountHolder: "Alice",
      lightningAddress: "  alice@getalby.com ",
    });

    expect(lightningPayload).toEqual({ type: "lightning", lightningAddress: "alice@getalby.com" });
  });

  it("sends a null lightning address when it is blank so the node wallet receives the payment", () => {
    expect(buildPayoutAccountPayload({ type: "lightning", lightningAddress: "   " })).toEqual({
      type: "lightning",
      lightningAddress: null,
    });
  });

  it("sends the trimmed bank fields, blanks as null and never a lightning address", () => {
    const bankPayload = buildPayoutAccountPayload({
      type: "bank",
      accountHolder: " Bob ",
      bankName: "BBVA",
      accountNumber: "",
      currencyId: "currency-mxn",
      swift: " ",
      iban: "",
      clabe: "012180001234567890",
      lightningAddress: "bob@getalby.com",
    });

    expect(bankPayload).toEqual({
      type: "bank",
      accountHolder: "Bob",
      bankName: "BBVA",
      accountNumber: null,
      currencyId: "currency-mxn",
      swift: null,
      iban: null,
      clabe: "012180001234567890",
      lightningAddress: null,
    });
  });
});
