export const NWC_CONNECTION_ERROR_TRANSLATIONS = {
  nwc_connection_failed: "nwcConnection.errors.connectionFailed",
  nwc_reconfigure_failed: "nwcConnection.errors.connectionFailed",
  provider_switch_not_supported: "nwcConnection.errors.providerSwitchNotSupported",
};

export function getNwcConnectionErrorDescription(translate, nwcConnectionError) {
  const translationKey = NWC_CONNECTION_ERROR_TRANSLATIONS[nwcConnectionError?.code];
  if (translationKey) {
    return translate(translationKey);
  }
  if (nwcConnectionError?.message) {
    return nwcConnectionError.message;
  }
  return translate("nwcConnection.errors.unknown");
}
