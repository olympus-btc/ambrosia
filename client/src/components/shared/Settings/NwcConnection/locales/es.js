const nwcConnectionEs = {
  nwcConnection: {
    title: "Conexión NWC",
    description: "Vuelve a introducir la URI de conexión si tu billetera NWC dejó de funcionar.",
    manageButton: "Administrar conexión",
    modalTitle: "Confirmar acceso a la billetera",
    passwordLabel: "Contraseña de la billetera",
    confirmButton: "Entrar",
    cancelButton: "Cancelar",
    uriLabel: "URI de conexión NWC",
    uriInvalid: "Formato de URI de NWC inválido",
    submitButton: "Guardar",
    hideButton: "Cerrar",
    success: "Conexión NWC actualizada correctamente",
    errors: {
      connectionFailed: "No se pudo conectar con la billetera usando esa URI — revisa que sea correcta y que la billetera esté disponible",
      providerSwitchNotSupported: "Cambiar de proveedor de Lightning todavía no está disponible desde aquí",
      unknown: "No se pudo actualizar la conexión NWC",
      secretsLocked: "El cifrado de secretos está bloqueado. Desbloquéalo en Configuración → Cifrado de secretos para actualizar la conexión NWC.",
    },
  },
};

export default nwcConnectionEs;
