import lightningEs from "../Lightning/locales/es";
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
    },
    cardLanguage: {
      title: "Idioma",
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
};

export default settingsEs;
