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
  },
};

export default ordersSyncEs;
