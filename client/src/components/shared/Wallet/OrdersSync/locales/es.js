const ordersSyncEs = {
  ordersSync: {
    title: "Sincronizar órdenes",
    subtitle: "Encuentra pagos Lightning confirmados sin una orden asociada y órdenes con la fecha registrada incorrecta.",
    dateRangeLabel: "Rango de fechas",
    period: {
      day: "Hoy",
      week: "Esta semana",
      month: "Este mes",
      year: "Este año",
    },
    periodFilter: {
      title: "Selecciona un rango de fechas",
      subtitle: "Elige un periodo rápido o un rango personalizado.",
    },
    syncButton: "Sincronizar",
    loadError: "No se pudieron cargar los resultados. Intenta de nuevo.",
    paymentsWithoutOrder: {
      title: "Pagos sin orden",
      empty: "No se encontraron pagos sin orden en este rango.",
    },
    misdatedOrders: {
      title: "Órdenes con fecha incorrecta",
      empty: "No se encontraron órdenes con fecha incorrecta en este rango.",
    },
    paymentWithoutOrderEditor: {
      title: "Confirmar pago sin orden",
      autoResolving: "Buscando coincidencias en tu catálogo…",
      unresolvedTitle: "Ítems que aún necesitan un producto",
      discardButton: "Descartar",
      assignButton: "Asignar producto",
      addProductButton: "Agregar producto",
      catalogTotalLabel: "Total actual del catálogo",
      historicalTotalLabel: "Total a registrar (precio histórico)",
      confirmError: "No se pudo confirmar esta orden. Intenta de nuevo.",
      cancelButton: "Cancelar",
      confirmButton: "Confirmar orden",
      searchTitle: "Buscar un producto",
    },
    misdatedOrderRow: {
      recordedDateLabel: "Fecha registrada",
      actualDateLabel: "Fecha real del pago",
      correctionError: "No se pudo corregir la fecha de esta orden. Intenta de nuevo.",
      confirmButton: "Confirmar corrección",
    },
  },
};

export default ordersSyncEs;
