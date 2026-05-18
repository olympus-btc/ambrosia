import closeChannelEn from "../CloseChannel/locales/en";
import nodeInfoEn from "../NodeInfo/locales/en";
import transactionsEn from "../Transactions/locales/en";

const walletEn = {
  wallet: {
    title: "Wallet",
    errorTitle: "Error",
    subtitle: "Track your BTC balance and transactions",
    loadingMessage: "Loading wallet info...",
    clipboard: {
      successTitle: "Copied",
      successDescription: "Text copied to clipboard",
      errorTitle: "Error",
      errorDescription: "Could not copy to clipboard",
    },
    access: {
      title: "Confirm Wallet Access",
      passwordLabel: "Password",
      confirmText: "Access",
      cancelText: "Cancel",
    },
    ...nodeInfoEn,
    ...transactionsEn,
    ...closeChannelEn,
  },
};

export default walletEn;
