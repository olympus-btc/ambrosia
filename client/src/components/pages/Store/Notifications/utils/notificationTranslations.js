import notificationsEn from "../locales/en";
import notificationsEs from "../locales/es";

function getNotificationsMessages(locale) {
  const normalizedLocale = typeof locale === "string" ? locale.toLowerCase() : "";
  return normalizedLocale.startsWith("es")
    ? notificationsEs.notifications
    : notificationsEn.notifications;
}

function getMessageByPath(messages, messagePath) {
  return messagePath
    .split(".")
    .reduce((currentMessage, messagePathPart) => currentMessage?.[messagePathPart], messages);
}

function interpolateMessage(message, interpolationValues = {}) {
  if (typeof message !== "string") return message;
  return Object.entries(interpolationValues).reduce(
    (interpolatedMessage, [placeholderName, placeholderValue]) => (
      interpolatedMessage.replaceAll(`{${placeholderName}}`, placeholderValue)
    ),
    message,
  );
}

export function createNotificationsTranslator(locale) {
  const notificationsMessages = getNotificationsMessages(locale);
  return (messagePath, interpolationValues) => {
    const message = getMessageByPath(notificationsMessages, messagePath);
    return typeof message === "string"
      ? interpolateMessage(message, interpolationValues)
      : messagePath;
  };
}
