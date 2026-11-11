const ordersSyncEn = {
  ordersSync: {
    title: "Sync orders",
    subtitle: "Find confirmed Lightning payments with no associated order, and orders with an incorrect recorded date.",
    dateRangeLabel: "Date range",
    period: {
      day: "Today",
      week: "This Week",
      month: "This Month",
      year: "This Year",
    },
    periodFilter: {
      title: "Select a date range",
      subtitle: "Choose a quick period or pick a custom range.",
    },
    syncButton: "Sync",
    loadError: "Could not load the results. Please try again.",
    paymentsWithoutOrder: {
      title: "Payments without an order",
      empty: "No payments without an order were found in this range.",
    },
    misdatedOrders: {
      title: "Orders with an incorrect date",
      empty: "No orders with an incorrect date were found in this range.",
    },
    paymentWithoutOrderEditor: {
      title: "Confirm payment without an order",
      autoResolving: "Matching purchased items to your catalog…",
      unresolvedTitle: "Items that still need a product",
      discardButton: "Discard",
      assignButton: "Assign product",
      addProductButton: "Add product",
      catalogTotalLabel: "Current catalog total",
      historicalTotalLabel: "Total to record (historical price)",
      confirmError: "Could not confirm this order. Please try again.",
      cancelButton: "Cancel",
      confirmButton: "Confirm order",
      searchTitle: "Find a product",
    },
  },
};

export default ordersSyncEn;
