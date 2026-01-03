import { addToast } from "@heroui/react";

export const formatSats = (amount) => (new Intl.NumberFormat().format(amount));

export const copyToClipboard = async (text, t) => {
  const fallbackCopy = (textToCopy) => {
    const textarea = document.createElement("textarea");
    textarea.value = textToCopy;
    textarea.style.position = "fixed";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      addToast({
        title: t("clipboard.successTitle"),
        description: t("clipboard.successDescription"),
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      console.error("Fallback copy failed", err);
      addToast({
        title: t("clipboard.errorTitle"),
        description: t("clipboard.errorDescription"),
        variant: "solid",
        color: "danger",
      });
    }
    document.body.removeChild(textarea);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      addToast({
        title: t("clipboard.successTitle"),
        description: t("clipboard.successDescription"),
        variant: "solid",
        color: "success",
      });
    } catch {
      console.error(t("clipboard.errorDescription"));
      fallbackCopy(text);
    }
  } else {
    fallbackCopy(text);
  }
};
