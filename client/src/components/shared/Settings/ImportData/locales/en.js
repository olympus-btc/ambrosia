const importDataEn = {
  cardImportData: {
    title: "Import data",
    description: "Restore your business data from a backup file exported from another Ambrosia installation. This overwrites all current data.",
    importButton: "Import data",
    modalTitle: "Confirm access",
    passwordLabel: "Wallet password",
    cancelButton: "Cancel",
    confirmButton: "Confirm",
    missingFields: "Enter the backup password and select a file to continue.",
    continueButton: "Continue",
    importing: "Importing your backup...",
    phaseUploading: "Uploading your backup...",
    phaseExtracting: "Processing your backup...",
    success: "Backup imported successfully.",
    errorDescription: "Could not import the backup. Check the file and try again.",
    pendingImportError: "A previous import is still pending — restart the Ambrosia server, then try again.",
    confirmModal: {
      title: "Overwrite all business data?",
      description: "This replaces every product, order, user, and setting with the contents of the backup file.",
      warning: "This action cannot be undone unless you have another backup of the current data.",
      cancelButton: "Cancel",
      confirmButton: "Overwrite and import",
    },
  },
};

export default importDataEn;
