const reportsEs = {
  reports: {
    header: {
      title: "Reportes de Ventas",
      subtitle: "Análisis de productos vendidos",
    },
    dates: {
      title: "Seleccionar Período",
      subtitle: "Filtra y analiza tus ventas por período y producto",
      filtersActive: "{count} filtros activos",
      period: {
        week: "Esta Semana",
        month: "Este Mes",
        year: "Este Año",
      },
      startLabel: "Fecha de Inicio",
      endLabel: "Fecha Final",
    },
    filters: {
      productName: "Nombre del Producto",
      productNamePlaceholder: "Buscar por producto...",
      paymentMethod: "Método de Pago",
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
      errorTitle: "Error",
      errorGenerate: "No se pudo generar el reporte",
    },
    errors: {
      bothDates: "Debes proporcionar fecha de inicio y fecha final",
      invalidRange: "La fecha de inicio no puede ser posterior a la fecha final",
    },
    summary: {
      title: "Resumen",
      subtitle: "Totales consolidados del período seleccionado",
      revenue: "Ingresos Totales",
      items: "Productos Vendidos",
    },
    charts: {
      title: "Analítica",
      subtitle: "Visualiza tendencias de ingresos y distribución de ventas",
      revenueOverTime: "Ingresos por Día",
      topProducts: "Top Productos por Ingresos",
      paymentSplit: "Distribución de Métodos de Pago",
    },
    payment: {
      unknown: "Desconocido",
    },
    sales: {
      title: "Detalle de Ventas",
      subtitle: "Registro completo de transacciones del período",
      empty: "No se encontraron ventas con los filtros seleccionados",
      export: "Exportar CSV",
      product: "Producto",
      user: "Usuario",
      quantity: "Cant.",
      price: "Precio Unitario",
      total: "Total",
      paymentMethod: "Método de Pago",
      date: "Fecha",
      rowsPerPage: "Filas por página",
      paginationAria: "Paginación de ventas",
      tableAriaLabel: "Detalle de ventas",
    },
    close: {
      modalTitle: "Confirmar Cierre de Turno",
      modalQuestion: "¿Estás seguro de que quieres cerrar el turno?",
      cancel: "Cancelar",
      confirm: "Cerrar Turno",
      confirming: "Cerrando...",
    },
  },
};

export default reportsEs;
