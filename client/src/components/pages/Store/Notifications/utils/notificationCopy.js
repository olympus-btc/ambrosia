import notificationsEn from "../locales/en";

const WALLET_NOTIFICATION_TYPES = {
  PAYMENT_SENT: "wallet.payment.sent",
  PAYMENT_RECEIVED: "wallet.payment.received",
  PAYMENT_FAILED: "wallet.payment.failed",
  CHANNEL_CLOSED: "wallet.channel.closed",
  FEE_BUMPED: "wallet.fee.bumped",
};

const PAYMENT_KIND_TITLE_TRANSLATION_KEYS = {
  lightning_invoice: "display.walletPaymentSentLightningTitle",
  bolt12_offer: "display.walletPaymentSentOfferTitle",
  onchain: "display.walletPaymentSentOnchainTitle",
};

const NOTIFICATION_COPY_TRANSLATION_KEYS = {
  [WALLET_NOTIFICATION_TYPES.PAYMENT_SENT]: {
    title: "display.walletPaymentSentTitle",
    description: "display.walletPaymentSentDescription",
  },
  [WALLET_NOTIFICATION_TYPES.PAYMENT_RECEIVED]: {
    title: "display.walletPaymentReceivedTitle",
    description: "display.walletPaymentReceivedDescription",
  },
  [WALLET_NOTIFICATION_TYPES.PAYMENT_FAILED]: {
    title: "display.walletPaymentFailedTitle",
    description: "display.walletPaymentFailedDescription",
  },
  [WALLET_NOTIFICATION_TYPES.CHANNEL_CLOSED]: {
    title: "display.walletChannelClosedTitle",
    description: "display.walletChannelClosedDescription",
  },
  [WALLET_NOTIFICATION_TYPES.FEE_BUMPED]: {
    title: "display.walletFeeBumpedTitle",
    description: "display.walletFeeBumpedDescription",
  },
};

export function getNotificationTranslation(
  notificationsTranslations,
  translationKey,
  interpolationValues,
  fallbackText = "",
) {
  try {
    const translatedText = notificationsTranslations(translationKey, interpolationValues);
    return translatedText === translationKey
      ? getFallbackTranslation(translationKey, interpolationValues, fallbackText)
      : translatedText;
  } catch {
    return getFallbackTranslation(translationKey, interpolationValues, fallbackText);
  }
}

function getFallbackTranslation(
  translationKey,
  interpolationValues = {},
  fallbackText = "",
) {
  if (typeof translationKey !== "string") return fallbackText;

  const fallbackTemplate = translationKey
    .split(".")
    .reduce(
      (currentMessageNode, translationKeyPart) => currentMessageNode?.[translationKeyPart],
      notificationsEn.notifications,
    );

  if (typeof fallbackTemplate !== "string") return fallbackText;

  return Object.entries(interpolationValues).reduce(
    (translatedText, [placeholderName, placeholderValue]) => (
      translatedText.replaceAll(`{${placeholderName}}`, placeholderValue)
    ),
    fallbackTemplate,
  );
}

function getPaymentSentTitle(
  notificationMetadata,
  notificationsTranslations,
  fallbackTitle,
) {
  const titleTranslationKey =
    PAYMENT_KIND_TITLE_TRANSLATION_KEYS[notificationMetadata.paymentKind] ||
    "display.walletPaymentSentTitle";
  return getNotificationTranslation(
    notificationsTranslations,
    titleTranslationKey,
    undefined,
    fallbackTitle,
  );
}

function getNotificationTitle({
  notification,
  notificationMetadata,
  notificationsTranslations,
  fallbackTitle,
}) {
  if (notification?.type === WALLET_NOTIFICATION_TYPES.PAYMENT_SENT) {
    return getPaymentSentTitle(notificationMetadata, notificationsTranslations, fallbackTitle);
  }

  return getNotificationTranslation(
    notificationsTranslations,
    NOTIFICATION_COPY_TRANSLATION_KEYS[notification?.type]?.title,
    undefined,
    fallbackTitle,
  );
}

export function getNotificationCopy({
  notification,
  notificationMetadata,
  notificationsTranslations,
  interpolationValues,
}) {
  const fallbackTitle =
    notification?.title ||
    getNotificationTranslation(
      notificationsTranslations,
      "display.fallbackTitle",
      undefined,
      "Notification",
    );
  const fallbackDescription =
    notification?.body ||
    getNotificationTranslation(
      notificationsTranslations,
      "display.fallbackDescription",
      undefined,
      "Open the notification feed to review details.",
    );

  const notificationCopyTranslationKeys = NOTIFICATION_COPY_TRANSLATION_KEYS[notification?.type];

  if (!notificationCopyTranslationKeys) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
    };
  }

  return {
    title: getNotificationTitle({
      notification,
      notificationMetadata,
      notificationsTranslations,
      fallbackTitle,
    }),
    description: getNotificationTranslation(
      notificationsTranslations,
      notificationCopyTranslationKeys.description,
      interpolationValues,
      fallbackDescription,
    ),
  };
}
