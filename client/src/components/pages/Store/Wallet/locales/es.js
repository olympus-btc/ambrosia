import closeChannelEs from "../CloseChannel/locales/es";
import nodeInfoEs from "../NodeInfo/locales/es";
import transactionsEs from "../Transactions/locales/es";

const walletEs = {
  wallet: {
    title: "Wallet",
    errorTitle: "Error",
    subtitle: "Supervisa tu saldo y tus transacciones en BTC",
    loadingMessage: "Cargando información de la wallet...",
    clipboard: {
      successTitle: "Copiado",
      successDescription: "Texto copiado al portapapeles",
      errorTitle: "Error",
      errorDescription: "No se pudo copiar al portapapeles",
    },
    access: {
      title: "Confirmar acceso a Wallet",
      passwordLabel: "Contraseña",
      confirmText: "Entrar",
      cancelText: "Cancelar",
    },
    passwordChange: {
      title: "Contraseña de Wallet",
      description: "Cambia la contraseña usada para desbloquear acciones de la wallet.",
      currentPasswordLabel: "Contraseña actual",
      newPasswordLabel: "Nueva contraseña",
      confirmPasswordLabel: "Confirmar nueva contraseña",
      requiredError: "Este campo es obligatorio",
      mismatchError: "Las contraseñas no coinciden",
      currentPasswordIncorrectError: "La contraseña actual es incorrecta",
      submitButton: "Cambiar contraseña",
      successToast: "Contraseña de wallet actualizada",
      errorToast: "No se pudo actualizar la contraseña de wallet",
      toggleCurrentPassword: "Mostrar u ocultar contraseña actual",
      toggleNewPassword: "Mostrar u ocultar nueva contraseña",
      toggleConfirmPassword: "Mostrar u ocultar confirmación de contraseña",
    },
    ...nodeInfoEs,
    ...transactionsEs,
    ...closeChannelEs,
  },
};

export default walletEs;
