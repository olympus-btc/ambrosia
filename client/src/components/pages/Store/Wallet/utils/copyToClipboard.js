import { addToast } from "@heroui/react";

const toast = (t, success) => addToast({
  title: t(success ? "clipboard.successTitle" : "clipboard.errorTitle"),
  description: t(success ? "clipboard.successDescription" : "clipboard.errorDescription"),
  variant: "solid",
  color: success ? "success" : "danger",
});

const selectText = (textarea) => {
  const isIOS = /ipad|iphone/i.test(navigator.userAgent);
  if (isIOS) {
    const range = document.createRange();
    range.selectNodeContents(textarea);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    textarea.setSelectionRange(0, 999999);
  } else {
    textarea.select();
  }
};

const fallbackCopy = (text, t) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.className = "absolute -left-[9999px] -top-[9999px] text-[12pt]";
  const container = document.activeElement?.closest('[role="dialog"]') ?? document.body;
  container.appendChild(textarea);
  textarea.focus();
  selectText(textarea);
  const success = document.execCommand("copy");
  container.removeChild(textarea);
  toast(t, success);
};

export const copyToClipboard = (text, t) => {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
      .then(() => toast(t, true))
      .catch(() => fallbackCopy(text, t));
  }
  fallbackCopy(text, t);
};
