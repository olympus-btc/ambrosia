import printersEs from "../Printers/locales/es";
import storeInfoEs from "../StoreInfo/locales/es";
import ticketTemplatesEs from "../TicketTemplates/locales/es";

const settingsEs = {
  settings: {
    subtitle: "Administra tu tienda",
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
    ...printersEs,
    ...ticketTemplatesEs,
  },
};

export default settingsEs;
