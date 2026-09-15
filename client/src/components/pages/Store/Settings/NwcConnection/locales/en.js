const nwcConnectionEn = {
  nwcConnection: {
    title: "NWC Connection",
    description: "Re-enter the connection URI if your NWC wallet stopped working.",
    manageButton: "Manage connection",
    modalTitle: "Confirm Wallet access",
    passwordLabel: "Wallet password",
    confirmButton: "Enter",
    cancelButton: "Cancel",
    uriLabel: "NWC connection URI",
    uriInvalid: "Invalid NWC URI format",
    submitButton: "Save",
    hideButton: "Close",
    success: "NWC connection updated successfully",
    errors: {
      connectionFailed: "Could not connect to the wallet with that URI — check that it's correct and the wallet is reachable",
      providerSwitchNotSupported: "Switching Lightning providers is not available here yet",
      unknown: "Could not update the NWC connection",
      secretsLocked: "Secrets encryption is locked. Unlock it in Settings → Secrets encryption to update the NWC connection.",
    },
  },
};

export default nwcConnectionEn;
