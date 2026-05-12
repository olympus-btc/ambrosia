const reportsEs = {
  reports: {
    header: {
      title: "Reportes de Ventas",
      subtitle: "Análisis de productos vendidos",
      back: "Inicio",
      refreshAria: "Actualizar datos",
    },
    dates: {
      title: "Seleccionar Período",
      period: {
        week: "Esta Semana",
        month: "Este Mes",
        year: "Este Año",
      },
      startLabel: "Fecha de Inicio",
      endLabel: "Fecha Final",
      generate: "Generar Reporte",
      generating: "Generando...",
    },
    filters: {
      productName: "Nombre del Producto",
      productNamePlaceholder: "Buscar por producto...",
      paymentMethod: "Método de Pago",
      paymentMethodPlaceholder: "Ej. Efectivo, BTC...",
      clear: "Limpiar filtros",
      paymentMethods: {
        all: "Todos los métodos",
        cash: "Efectivo",
        btc: "Bitcoin (BTC)",
        debitCard: "Tarjeta de Débito",
        creditCard: "Tarjeta de Crédito",
      },
    },
    statuses: {
      loading: "Cargando reportes...",
      generatedTitle: "Reporte generado",
      generatedDesc: "El reporte se generó correctamente",
      errorTitle: "Error",
      errorGenerate: "No se pudo generar el reporte",
    },
    errors: {
      bothDates: "Debes proporcionar fecha de inicio y fecha final",
      invalidRange: "La fecha de inicio no puede ser posterior a la fecha final",
    },
    summary: {
      title: "Resumen",
      revenue: "Ingresos Totales",
      items: "Productos Vendidos",
    },
    sales: {
      title: "Detalle de Ventas",
      empty: "No se encontraron ventas con los filtros seleccionados",
      quantity: "Cant.",
      price: "Precio Unitario",
      total: "Total",
    },
    close: {
      sectionTitle: "Cerrar turno",
      sectionSubtitle: "Finaliza el día y consolida los movimientos del período seleccionado.",
      balanceLabel: "Balance:",
      modalTitle: "Confirmar Cierre de Turno",
      modalQuestion: "¿Estás seguro de que quieres cerrar el turno?",
      modalDesc: "Esta acción finalizará el turno actual y generará un reporte final. Asegúrate de que todas las operaciones del día estén completas.",
      modalPeriodBalance: "Balance del período:",
      cancel: "Cancelar",
      confirm: "Cerrar Turno",
      confirming: "Cerrando...",
    },
  },
};

export default reportsEs;
