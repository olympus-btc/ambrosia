import lightningEn from "../Lightning/locales/en";
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
    },
    cardLanguage: {
      title: "Language",
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
};

export default settingsEn;
