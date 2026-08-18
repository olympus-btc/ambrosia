import lightningEs from "../Lightning/locales/es";
import nwcConnectionEs from "../NwcConnection/locales/es";
import printersEs from "../Printers/locales/es";
import seedEs from "../Seed/locales/es";
import storeInfoEs from "../StoreInfo/locales/es";
import ticketTemplatesEs from "../TicketTemplates/locales/es";
import tutorialsEs from "../Tutorials/locales/es";

const settingsEs = {
  settings: {
    title: "Configuración",
    subtitle: "Administra tu tienda",
    cardCurrency: {
      title: "Moneda",
      currencyLabel: "Cambiar moneda",
      successTitle: "Moneda Actualizada",
      successDescription: "La moneda de la tienda se ha cambiado correctamente.",
      errorTitle: "Error al actualizar moneda",
      errorDescription: "No se pudo actualizar la moneda de la tienda.",
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
      subtitle: "Elige como los admins reciben alertas de actividad importante.",
      walletTitle: "Actividad Wallet",
      inApp: "En app",
      push: "Web Push",
      testPush: "Probar push",
      error: "No se pudieron cargar las preferencias de notificaciones.",
      pushErrorTitle: "No se pudo activar Web Push",
      pushErrors: {
        denied: "El permiso del navegador esta denegado. Activa las notificaciones para este sitio en la configuracion del navegador.",
        default: "Se requiere permiso del navegador antes de activar Web Push.",
        failed: "El navegador no pudo crear la suscripcion push. Intenta de nuevo despues de actualizar la app.",
        unsupported: "Este navegador o app shell no soporta Web Push.",
        vapidUnavailable: "Al servidor le falta configuracion VAPID o Web Push esta desactivado.",
        serviceWorkerUnavailable: "El service worker del navegador no esta activo. Corre el cliente en produccion o actualiza despues de que la app termine de cargar.",
        timeout: "El navegador no termino la operacion Web Push. Actualiza la app e intenta de nuevo.",
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
    ...storeInfoEs,
    ...printersEs,
    ...ticketTemplatesEs,
    ...seedEs,
    ...tutorialsEs,
  },
  ...lightningEs,
  ...nwcConnectionEs,
};

export default settingsEs;
