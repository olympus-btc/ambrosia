import lightningEn from "../Lightning/locales/en";
import nwcConnectionEn from "../NwcConnection/locales/en";
import printersEn from "../Printers/locales/en";
import seedEn from "../Seed/locales/en";
import storeInfoEn from "../StoreInfo/locales/en";
import ticketTemplatesEn from "../TicketTemplates/locales/en";
import tutorialsEn from "../Tutorials/locales/en";

const settingsEn = {
  settings: {
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
    ...storeInfoEn,
    ...printersEn,
    ...ticketTemplatesEn,
    ...seedEn,
    ...tutorialsEn,
  },
  ...lightningEn,
  ...nwcConnectionEn,
};

export default settingsEn;
