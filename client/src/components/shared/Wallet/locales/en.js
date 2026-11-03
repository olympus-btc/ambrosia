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
    permissionBlocked: {
      title: "You can't access the wallet",
      subtitle: "Ask an administrator to grant you the Access wallet permission.",
    },
    passwordChange: {
      title: "Wallet password",
      description: "Change the password used to unlock wallet actions.",
      currentPasswordLabel: "Current password",
      newPasswordLabel: "New password",
      confirmPasswordLabel: "Confirm new password",
      requiredError: "This field is required",
      mismatchError: "Passwords do not match",
      currentPasswordIncorrectError: "Current password is incorrect",
      submitButton: "Change password",
      successToast: "Wallet password updated",
      errorToast: "Could not update wallet password",
      toggleCurrentPassword: "Show or hide current password",
      toggleNewPassword: "Show or hide new password",
      toggleConfirmPassword: "Show or hide password confirmation",
    },
    ...nodeInfoEn,
    ...transactionsEn,
    ...closeChannelEn,
  },
};

export default walletEn;
