import { createNotificationsTranslator } from "../notificationTranslations";

describe("createNotificationsTranslator", () => {
  it("uses Spanish notification messages when the app locale is Spanish", () => {
    const notificationsTranslator = createNotificationsTranslator("es");

    expect(notificationsTranslator("display.walletPaymentReceivedTitle")).toBe("Pago recibido en billetera");
    expect(notificationsTranslator("display.walletPaymentReceivedDescription", {
      amount: "90 sats",
    })).toBe("Se recibio un pago de 90 sats en la billetera.");
  });

  it("uses English notification messages by default", () => {
    const notificationsTranslator = createNotificationsTranslator("en");

    expect(notificationsTranslator("display.walletPaymentReceivedTitle")).toBe("Payment received in wallet");
  });
});
