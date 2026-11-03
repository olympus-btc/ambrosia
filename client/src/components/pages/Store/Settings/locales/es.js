import printersEs from "../Printers/locales/es";
import storeInfoEs from "../StoreInfo/locales/es";
import ticketTemplatesEs from "../TicketTemplates/locales/es";

const settingsEs = {
  settings: {
    subtitle: "Administra tu tienda",
    cardPriceStep: {
      label: "Ajuste de precio",
      help: "Cuántos centavos se suman o restan al ajustar el precio de un producto",
      saveButton: "Guardar",
      successTitle: "Ajuste de precio actualizado",
      successDescription: "El ajuste de precio se actualizó correctamente.",
      errorTitle: "Error al actualizar el ajuste de precio",
      errorDescription: "No se pudo actualizar el ajuste de precio.",
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
      customTipDefaultTypeLabel: "Tipo predeterminado de propina personalizada",
      customTipDefaultTypeHelp: "Define si el botón Personalizado se abre en porcentaje o en monto fijo",
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
