import exportDataEs from "../ExportData/locales/es";
import importDataEs from "../ImportData/locales/es";
import lightningEs from "../Lightning/locales/es";
import nwcConnectionEs from "../NwcConnection/locales/es";
import phoenixdRemoteCardEs from "../PhoenixdRemote/locales/es";
import printersEs from "../Printers/locales/es";
import secretsEncryptionCardEs from "../SecretsEncryption/locales/es";
import seedEs from "../Seed/locales/es";
import storeInfoEs from "../StoreInfo/locales/es";
import systemEs from "../System/locales/es";
import ticketTemplatesEs from "../TicketTemplates/locales/es";
import tutorialsEs from "../Tutorials/locales/es";

const settingsEs = {
  settings: {
    appVersion: "AmbrosiaPoS v",
    categories: {
      business: "Negocio",
      preferences: "Preferencias",
      wallet: "Bitcoin y billetera",
      backup: "Respaldo y datos",
      devices: "Dispositivos y conexión",
      printing: "Impresión",
      system: "Sistema",
      help: "Ayuda",
    },
    secureConnection: {
      title: "Conexión segura",
      subtitle: "Certificado de esta unidad Ambrosia",
      unavailable: "No se pudo consultar el certificado. Comprueba la conexión y vuelve a abrir Ajustes.",
      httpsSession: "Sesión HTTPS",
      httpSession: "Esta sesión usa HTTP",
      sessionHint: "Comprueba que el navegador no muestre advertencias. Esta página no puede confirmar la instalación de la CA en el sistema.",
      issued: "Válido desde",
      expires: "Vence",
      qrLabel: "QR para instalar el certificado de esta unidad",
      qrHint: "Para configurar otro dispositivo, conéctalo a la misma red y escanea este QR. Verifica la huella con una referencia confiable antes de instalar.",
      instructions: "Ver instrucciones de instalación y desinstalación",
    },
    title: "Configuración",
    subtitle: "Administra tu tienda",
    cardCurrency: {
      title: "Moneda",
      currencyLabel: "Cambiar moneda",
      successTitle: "Moneda Actualizada",
      successDescription: "La moneda de la tienda se ha cambiado correctamente.",
      errorTitle: "Error al actualizar moneda",
      errorDescription: "No se pudo actualizar la moneda de la tienda.",
      priceStepLabel: "Ajuste de precio",
      priceStepHelp: "Cuántos centavos se suman o restan al ajustar el precio de un producto",
      priceStepSaveButton: "Guardar",
      priceStepSuccessTitle: "Ajuste de precio actualizado",
      priceStepSuccessDescription: "El ajuste de precio se actualizó correctamente.",
      priceStepErrorTitle: "Error al actualizar el ajuste de precio",
      priceStepErrorDescription: "No se pudo actualizar el ajuste de precio.",
    },
    cardQRUrl: {
      title: "Abrir en otro dispositivo",
      subtitle: "Escanea este código QR para abrir Ambrosia.",
      helper: "Usa la cámara de tu teléfono u otro dispositivo para escanearlo.",
      qrLabel: "Código QR para abrir Ambrosia en otro dispositivo",
    },
    cardLanguage: {
      title: "Idioma",
    },
    cardDisplay: {
      title: "Pantalla",
      subtitle: "Opciones de apariencia y accesibilidad",
      disableAnimations: "Desactivar animaciones",
      disableAnimationsHint: "Recomendado para dispositivos de bajos recursos para mejorar el rendimiento",
    },
    cardNotifications: {
      title: "Notificaciones",
      subtitle: "Elige cómo los admins reciben alertas de actividad importante.",
      walletTitle: "Actividad de la billetera",
      inApp: "En app",
      push: "Web Push",
      testPush: "Probar push",
      error: "No se pudieron cargar las preferencias de notificaciones.",
      pushErrorTitle: "No se pudo activar Web Push",
      pushErrors: {
        denied: "El permiso del navegador está denegado. Activa las notificaciones para este sitio en la configuración del navegador.",
        default: "Se requiere permiso del navegador antes de activar Web Push.",
        failed: "El navegador no pudo crear la suscripción push. Intenta de nuevo después de actualizar la app.",
        unsupported: "Este navegador o app shell no soporta Web Push.",
        vapidUnavailable: "Al servidor le falta la configuración VAPID o Web Push está desactivado.",
        serviceWorkerUnavailable: "El service worker del navegador no está activo. Corre el cliente en producción o actualiza después de que la app termine de cargar.",
        timeout: "El navegador no terminó la operación Web Push. Actualiza la app e intenta de nuevo.",
      },
    },
    cardInstall: {
      title: "Instalar App",
      subtitle: "Instala Ambrosia POS en tu dispositivo para acceso rápido.",
      button: "Instalar",
      iosStep1: "Toca el ícono de compartir",
      iosStep2: "Selecciona \"Agregar a pantalla de inicio\"",
      androidStep1: "Toca el menú ⋮",
      androidStep2: "Selecciona \"Agregar a pantalla de inicio\"",
    },
    cardTips: {
      title: "Propinas",
      subtitle: "Configuración del sistema de propinas",
      enableTips: "Habilitar propinas",
      enableTipsDescription: "Permite seleccionar propinas antes de cobrar en el carrito",
      percentagesLabel: "Porcentajes sugeridos",
      percentagesPlaceholder: "10, 15, 20",
      percentagesHelp: "Elige las opciones que se mostrarán al cliente al cobrar",
      percentagesError: "Selecciona al menos un porcentaje",
      customPercentage: "Personalizado",
      customPercentageLabel: "Porcentaje de propina personalizado",
      addPercentage: "Agregar",
      saveButton: "Guardar",
      successMessage: "Configuración de propinas guardada correctamente",
      errorMessage: "No se pudo guardar la configuración de propinas",
    },
    ...storeInfoEs,
    ...systemEs,
    ...printersEs,
    ...ticketTemplatesEs,
    ...seedEs,
    ...exportDataEs,
    ...importDataEs,
    ...tutorialsEs,
  },
  ...lightningEs,
  ...nwcConnectionEs,
  ...phoenixdRemoteCardEs,
  ...secretsEncryptionCardEs,
};

export default settingsEs;
