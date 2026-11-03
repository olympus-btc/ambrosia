import printersEn from "../Printers/locales/en";
import storeInfoEn from "../StoreInfo/locales/en";
import ticketTemplatesEn from "../TicketTemplates/locales/en";

const settingsEn = {
  settings: {
    subtitle: "Manage your store",
    cardPriceStep: {
      label: "Price step",
      help: "How many cents get added or subtracted when adjusting a product's price",
      saveButton: "Save",
      successTitle: "Price step updated",
      successDescription: "The price step has been changed successfully.",
      errorTitle: "Price step update failed",
      errorDescription: "Could not update the price step.",
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
      customTipDefaultTypeLabel: "Default custom tip type",
      customTipDefaultTypeHelp: "Whether the Custom tip button opens in percentage or fixed amount",
      saveButton: "Save",
      successMessage: "Tip settings saved successfully",
      errorMessage: "Failed to save tip settings",
    },
    ...storeInfoEn,
    ...printersEn,
    ...ticketTemplatesEn,
  },
};

export default settingsEn;
