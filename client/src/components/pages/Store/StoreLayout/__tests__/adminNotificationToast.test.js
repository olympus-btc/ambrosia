import { addToast } from "@heroui/react";

import {
  getAdminNotificationToastColor,
  showAdminNotificationToast,
} from "../adminNotificationToast";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

function createNotificationsTranslations(translationKey, interpolationValues = {}) {
  const messages = {
    "display.walletPaymentSentLightningTitle": "Lightning payment sent",
    "display.walletPaymentSentDescription": "{actor} sent {amount} from the wallet.",
    "display.fallbackAmount": "the selected amount",
    "toast.title": "New notification",
    "toast.description": "Open the notification feed.",
  };
  const translationTemplate = messages[translationKey] || translationKey;

  return Object.entries(interpolationValues).reduce(
    (translatedText, [placeholderName, placeholderValue]) => (
      translatedText.replaceAll(`{${placeholderName}}`, placeholderValue)
    ),
    translationTemplate,
  );
}

describe("adminNotificationToast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses danger color for failed notifications", () => {
    expect(getAdminNotificationToastColor({ status: "failed" })).toBe("danger");
  });

  it("uses success color for non-failed notifications", () => {
    expect(getAdminNotificationToastColor({ status: "success" })).toBe("success");
    expect(getAdminNotificationToastColor({})).toBe("success");
  });

  it("shows a toast with human notification copy", () => {
    showAdminNotificationToast(
      {
        type: "wallet.payment.sent",
        status: "success",
        actorUserName: "Seller",
        metadataJson: JSON.stringify({
          paymentKind: "lightning_invoice",
          recipientAmountSats: 10,
        }),
      },
      createNotificationsTranslations,
    );

    expect(addToast).toHaveBeenCalledWith({
      color: "success",
      title: "Lightning payment sent",
      description: "Seller sent 10 sats from the wallet.",
    });
  });
});
