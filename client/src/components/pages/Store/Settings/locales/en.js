import exportDataEn from "../ExportData/locales/en";
import importDataEn from "../ImportData/locales/en";
import lightningEn from "../Lightning/locales/en";
import nwcConnectionEn from "../NwcConnection/locales/en";
import printersEn from "../Printers/locales/en";
import seedEn from "../Seed/locales/en";
import storeInfoEn from "../StoreInfo/locales/en";
import ticketTemplatesEn from "../TicketTemplates/locales/en";
import tutorialsEn from "../Tutorials/locales/en";

const settingsEn = {
  settings: {
    secureConnection: {
      title: "Secure connection",
      subtitle: "Certificate for this Ambrosia unit",
      unavailable: "Could not load the certificate. Check your connection and reopen Settings.",
      httpsSession: "HTTPS session",
      httpSession: "This session uses HTTP",
      sessionHint: "Check that your browser shows no warnings. This page cannot confirm installation of the CA in your system.",
      issued: "Valid from",
      expires: "Expires",
      qrLabel: "QR to install this unit's certificate",
      qrHint: "To set up another device, connect it to the same network and scan this QR. Verify the fingerprint against a trusted reference before installing.",
      instructions: "View installation and removal instructions",
    },
    title: "Settings",
    subtitle: "Manage your store",
    cardCurrency: {
      title: "Currency",
      currencyLabel: "Change currency",
      successTitle: "Currency Updated",
      successDescription: "The store currency has been changed successfully.",
      errorTitle: "Currency update failed",
      errorDescription: "Could not update the store currency.",
    },
    cardQRUrl: {
      title: "Open on another device",
      subtitle: "Scan this QR code to open Ambrosia.",
      helper: "Use your phone or another device's camera to scan it.",
      qrLabel: "QR code to open Ambrosia on another device",
    },
    cardLanguage: {
      title: "Language",
    },
    cardDisplay: {
      title: "Display",
      subtitle: "Appearance and accessibility options",
      disableAnimations: "Disable animations",
      disableAnimationsHint: "Recommended for low-resource devices to improve performance",
    },
    cardNotifications: {
      title: "Notifications",
      subtitle: "Choose how admins receive important activity alerts.",
      walletTitle: "Wallet activity",
      inApp: "In-app",
      push: "Web Push",
      testPush: "Test push",
      error: "Could not load notification preferences.",
      pushErrorTitle: "Web Push could not be enabled",
      pushErrors: {
        denied: "Browser permission is denied. Enable notifications for this site in browser settings.",
        default: "Browser permission is required before Web Push can be enabled.",
        failed: "The browser could not create the push subscription. Try again after refreshing the app.",
        unsupported: "This browser or app shell does not support Web Push.",
        vapidUnavailable: "The server is missing VAPID configuration or Web Push is disabled.",
        serviceWorkerUnavailable: "The browser service worker is not active. Run the production client or refresh after the app updates.",
        timeout: "The browser did not finish the Web Push operation. Refresh the app and try again.",
      },
    },
    cardInstall: {
      title: "Install App",
      subtitle: "Install Ambrosia POS on your device for quick access.",
      button: "Install",
      iosStep1: "Tap the share icon",
      iosStep2: "Select \"Add to Home Screen\"",
      androidStep1: "Tap the menu icon ⋮",
      androidStep2: "Select \"Add to Home Screen\"",
    },
    cardTips: {
      title: "Tips",
      subtitle: "Configure tipping system",
      enableTips: "Enable tips",
      enableTipsDescription: "Allow selecting tips before checkout in the cart",
      percentagesLabel: "Suggested percentages",
      percentagesPlaceholder: "10, 15, 20",
      percentagesHelp: "Choose the options shown to customers at checkout",
      percentagesError: "Select at least one percentage",
      customPercentage: "Custom",
      customPercentageLabel: "Custom tip percentage",
      addPercentage: "Add",
      saveButton: "Save",
      successMessage: "Tip settings saved successfully",
      errorMessage: "Failed to save tip settings",
    },
    ...storeInfoEn,
    ...printersEn,
    ...ticketTemplatesEn,
    ...seedEn,
    ...exportDataEn,
    ...importDataEn,
    ...tutorialsEn,
  },
  ...lightningEn,
  ...nwcConnectionEn,
};

export default settingsEn;
