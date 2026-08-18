import { getNotificationCopy, getNotificationTranslation } from "./notificationCopy";
import {
  formatNotificationAmountSats,
  getNotificationAmount,
  parseNotificationMetadata,
} from "./notificationMetadata";

const CATEGORY_TRANSLATION_KEYS = {
  wallet: "filters.wallet",
};
const TECHNICAL_ACTORS = new Set(["phoenix webhook"]);
const SYSTEM_ROLE = "system";

function isTechnicalActor(actorUserName) {
  return TECHNICAL_ACTORS.has(String(actorUserName ?? "").trim().toLowerCase());
}

export function getNotificationActorLabel(notification, notificationsTranslations) {
  if (isTechnicalActor(notification?.actorUserName)) {
    return getNotificationTranslation(
      notificationsTranslations,
      "display.actorExternalPayment",
      undefined,
      "External payment",
    );
  }

  if (notification?.actorUserName) return notification.actorUserName;
  if (notification?.actorUserId) return notification.actorUserId;

  if (notification?.actorRole === SYSTEM_ROLE) {
    return getNotificationTranslation(
      notificationsTranslations,
      "display.actorSystem",
      undefined,
      "System",
    );
  }

  return getNotificationTranslation(
    notificationsTranslations,
    "display.fallbackActor",
    undefined,
    "---",
  );
}

function getNotificationRoleLabel(notification, notificationsTranslations) {
  if (isTechnicalActor(notification?.actorUserName)) {
    return getNotificationTranslation(
      notificationsTranslations,
      "display.roleWallet",
      undefined,
      "Wallet",
    );
  }

  if (notification?.actorRole === SYSTEM_ROLE) {
    return getNotificationTranslation(
      notificationsTranslations,
      "display.roleSystem",
      undefined,
      "System",
    );
  }

  return notification?.actorRole || getNotificationTranslation(
    notificationsTranslations,
    "display.fallbackRole",
    undefined,
    "---",
  );
}

function getNotificationStatusLabel(notification, notificationsTranslations) {
  if (notification?.status === "success") {
    return getNotificationTranslation(
      notificationsTranslations,
      "display.statusSuccess",
      undefined,
      "Success",
    );
  }

  if (notification?.status === "failed") {
    return getNotificationTranslation(
      notificationsTranslations,
      "display.statusFailed",
      undefined,
      "Failed",
    );
  }

  return notification?.status || "";
}

function getNotificationCategoryLabel(notification, notificationsTranslations) {
  const notificationCategory = notification?.category;
  const categoryTranslationKey = CATEGORY_TRANSLATION_KEYS[notificationCategory];

  if (!categoryTranslationKey) return notificationCategory || "";

  return getNotificationTranslation(
    notificationsTranslations,
    categoryTranslationKey,
    undefined,
    notificationCategory,
  );
}

export function getAdminNotificationDisplay(notification, notificationsTranslations) {
  const notificationMetadata = parseNotificationMetadata(notification);
  const actorLabel = getNotificationActorLabel(notification, notificationsTranslations);
  const roleLabel = getNotificationRoleLabel(notification, notificationsTranslations);
  const amountLabel = formatNotificationAmountSats(getNotificationAmount(notificationMetadata));
  const statusLabel = getNotificationStatusLabel(notification, notificationsTranslations);
  const categoryLabel = getNotificationCategoryLabel(notification, notificationsTranslations);
  const interpolationValues = {
    actor: actorLabel,
    amount: amountLabel || getNotificationTranslation(
      notificationsTranslations,
      "display.fallbackAmount",
      undefined,
      "the selected amount",
    ),
    status: statusLabel,
  };
  const notificationCopy = getNotificationCopy({
    notification,
    notificationMetadata,
    notificationsTranslations,
    interpolationValues,
  });

  return {
    title: notificationCopy.title,
    description: notificationCopy.description,
    actorLabel,
    categoryLabel,
    roleLabel,
    amountLabel,
    statusLabel,
  };
}
