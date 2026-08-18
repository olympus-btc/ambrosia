const nwcConnectionEs = {
  nwcConnection: {
    title: "Conexión NWC",
    description: "Vuelve a introducir la URI de conexión si tu wallet NWC dejó de funcionar.",
    manageButton: "Administrar conexión",
    modalTitle: "Confirmar acceso a Wallet",
    passwordLabel: "Contraseña de wallet",
    confirmButton: "Entrar",
    cancelButton: "Cancelar",
    uriLabel: "URI de conexión NWC",
    uriInvalid: "Formato de URI de NWC inválido",
    submitButton: "Guardar",
    hideButton: "Cerrar",
    success: "Conexión NWC actualizada correctamente",
    errors: {
      connectionFailed: "No se pudo conectar con la wallet usando esa URI — revisa que sea correcta y que la wallet esté disponible",
      providerSwitchNotSupported: "Cambiar de proveedor de Lightning todavía no está disponible desde acá",
      unknown: "No se pudo actualizar la conexión NWC",
    },
  },
};

export default nwcConnectionEs;
