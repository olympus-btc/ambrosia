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
    ...nodeInfoEs,
    ...transactionsEs,
    ...closeChannelEs,
  },
};

export default walletEs;
