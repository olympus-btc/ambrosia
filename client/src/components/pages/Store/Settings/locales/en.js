import printersEn from "../Printers/locales/en";
import storeInfoEn from "../StoreInfo/locales/en";
import ticketTemplatesEn from "../TicketTemplates/locales/en";

const settingsEn = {
  settings: {
    subtitle: "Manage your store",
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
  },
};

export default settingsEn;
