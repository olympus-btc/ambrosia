import { render, screen } from "@testing-library/react";

import {
  ADMIN_NOTIFICATION_CATEGORY_WALLET,
  getWebPushStatusKey,
  isWebPushActiveOnDevice,
} from "@/lib/adminNotifications";

import notificationsEn from "../locales/en";
import notificationsEs from "../locales/es";
import { NotificationFeed } from "../NotificationFeed";
import { getAdminNotificationDisplay } from "../utils/notificationDisplay";
import {
  getNotificationAmount,
  parseNotificationMetadata,
} from "../utils/notificationMetadata";

function createTranslator(notificationMessages) {
  return (translationKey, interpolationValues = {}) => {
    const translationTemplate = translationKey
      .split(".")
      .reduce(
        (currentMessageNode, translationKeyPart) => currentMessageNode?.[translationKeyPart],
        notificationMessages.notifications,
      );
    if (typeof translationTemplate !== "string") return translationKey;
    return Object.entries(interpolationValues).reduce(
      (translatedText, [placeholderName, placeholderValue]) => (
        translatedText.replaceAll(`{${placeholderName}}`, placeholderValue)
      ),
      translationTemplate,
    );
  };
}

describe("Notifications Web Push preference state", () => {
  const walletPreference = {
    category: ADMIN_NOTIFICATION_CATEGORY_WALLET,
    inAppEnabled: true,
    pushEnabled: true,
  };

  it("does not show Web Push as active until this browser has a subscription", () => {
    const webPushState = {
      isSupported: true,
      permission: "default",
      subscriptionEndpoint: null,
      loading: false,
    };

    expect(isWebPushActiveOnDevice(walletPreference, webPushState)).toBe(false);
    expect(getWebPushStatusKey(webPushState, false)).toBe("permissionRequired");
  });

  it("shows Web Push as active only when permission and subscription exist", () => {
    const webPushState = {
      isSupported: true,
      permission: "granted",
      subscriptionEndpoint: "https://push.example/subscription",
      loading: false,
    };

    expect(isWebPushActiveOnDevice(walletPreference, webPushState)).toBe(true);
    expect(getWebPushStatusKey(webPushState, true)).toBe("active");
  });

  it("keeps unsupported devices inactive even when the backend preference is enabled", () => {
    const webPushState = {
      isSupported: false,
      permission: "unsupported",
      subscriptionEndpoint: null,
      loading: false,
    };

    expect(isWebPushActiveOnDevice(walletPreference, webPushState)).toBe(false);
    expect(getWebPushStatusKey(webPushState, false)).toBe("unsupported");
  });
});

describe("Admin notification display", () => {
  const notificationsTranslations = createTranslator(notificationsEn);
  const spanishNotificationsTranslations = createTranslator(notificationsEs);

  it("presents incoming wallet payments without technical webhook actor text", () => {
    const notificationDisplay = getAdminNotificationDisplay({
      type: "wallet.payment.received",
      title: "Wallet payment received",
      body: "Wallet received 90 sats",
      actorUserName: "Phoenix webhook",
      actorRole: "system",
      metadataJson: JSON.stringify({ amountSats: 90 }),
    }, notificationsTranslations);

    expect(notificationDisplay.title).toBe("Payment received in wallet");
    expect(notificationDisplay.description).toBe("A payment of 90 sats was received in the wallet.");
    expect(notificationDisplay.actorLabel).toBe("External payment");
    expect(notificationDisplay.roleLabel).toBe("Wallet");
  });

  it("presents sent wallet payments with actor and amount", () => {
    const notificationDisplay = getAdminNotificationDisplay({
      type: "wallet.payment.sent",
      title: "Wallet payment sent",
      actorUserName: "Seller",
      actorRole: "Admin",
      status: "success",
      metadataJson: JSON.stringify({
        paymentKind: "lightning_invoice",
        recipientAmountSats: 10,
      }),
    }, notificationsTranslations);

    expect(notificationDisplay.title).toBe("Lightning payment sent");
    expect(notificationDisplay.description).toBe("Seller sent 10 sats from the wallet.");
    expect(notificationDisplay.amountLabel).toBe("10 sats");
    expect(notificationDisplay.statusLabel).toBe("Success");
  });

  it("presents wallet category with translated copy", () => {
    const notificationDisplay = getAdminNotificationDisplay({
      category: ADMIN_NOTIFICATION_CATEGORY_WALLET,
      type: "wallet.payment.received",
      metadataJson: JSON.stringify({ amountSats: 90 }),
    }, spanishNotificationsTranslations);

    expect(notificationDisplay.categoryLabel).toBe("Billetera");
  });

  it("presents failed wallet payments with requested amount", () => {
    const notificationDisplay = getAdminNotificationDisplay({
      type: "wallet.payment.failed",
      title: "Wallet payment failed",
      actorUserName: "Admin",
      status: "failed",
      metadataJson: JSON.stringify({ requestedAmountSats: 1000 }),
    }, notificationsTranslations);

    expect(notificationDisplay.title).toBe("Wallet payment failed");
    expect(notificationDisplay.description).toBe("Admin tried to send 1,000 sats, but the payment failed.");
    expect(notificationDisplay.amountLabel).toBe("1,000 sats");
    expect(notificationDisplay.statusLabel).toBe("Failed");
  });

  it("keeps invalid metadata from breaking notification display", () => {
    const notification = {
      type: "unknown.notification",
      title: "Fallback title",
      body: "Fallback body",
      metadataJson: "{invalid",
    };

    expect(parseNotificationMetadata(notification)).toEqual({});
    expect(getNotificationAmount(parseNotificationMetadata(notification))).toBeNull();
    expect(getAdminNotificationDisplay(notification, notificationsTranslations)).toEqual(expect.objectContaining({
      title: "Fallback title",
      description: "Fallback body",
      amountLabel: null,
    }));
  });

  it("ignores metadata values that are not JSON objects", () => {
    expect(parseNotificationMetadata({ metadataJson: JSON.stringify(["unexpected"]) })).toEqual({});
    expect(parseNotificationMetadata({ metadataJson: JSON.stringify("unexpected") })).toEqual({});
  });

  it("renders presented feed copy instead of technical notification actor text", () => {
    render(
      <NotificationFeed
        notifications={[
          {
            id: "notification-1",
            category: ADMIN_NOTIFICATION_CATEGORY_WALLET,
            type: "wallet.payment.received",
            title: "Wallet payment received",
            body: "Wallet received 90 sats",
            actorUserName: "Phoenix webhook",
            actorRole: "system",
            metadataJson: JSON.stringify({ amountSats: 90 }),
            occurredAt: "2026-07-24T06:25:01.699301Z",
          },
        ]}
        loading={false}
        error={false}
        onDeleteNotification={jest.fn()}
        onMarkRead={jest.fn()}
        notificationsTranslations={notificationsTranslations}
      />,
    );

    expect(screen.getAllByText("A payment of 90 sats was received in the wallet.")).toHaveLength(2);
    expect(screen.getAllByText("Delete")).toHaveLength(2);
    expect(screen.getAllByText("External payment")).toHaveLength(2);
    expect(screen.getAllByText("Wallet")).toHaveLength(4);
    expect(screen.queryByText("Phoenix webhook")).not.toBeInTheDocument();
  });
});
