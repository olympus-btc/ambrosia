const reportsEn = {
  reports: {
    header: {
      title: "Sales Reports",
      subtitle: "Product sales analysis",
    },
    dates: {
      title: "Select Period",
      subtitle: "Filter and analyze your sales by period and product",
      filtersActive: "{count} filters active",
      period: {
        week: "This Week",
        month: "This Month",
        year: "This Year",
      },
      startLabel: "Start Date",
      endLabel: "End Date",
    },
    filters: {
      productName: "Product Name",
      productNamePlaceholder: "Search by product...",
      paymentMethod: "Payment Method",
      paymentMethods: {
        all: "All methods",
        cash: "Cash",
        btc: "Bitcoin (BTC)",
        debitCard: "Debit Card",
        creditCard: "Credit Card",
      },
    },
    statuses: {
      loading: "Loading reports...",
      errorTitle: "Error",
      errorGenerate: "Could not generate the report",
    },
    errors: {
      bothDates: "You must provide both start and end date",
      invalidRange: "Start date cannot be after end date",
    },
    summary: {
      title: "Summary",
      revenue: "Total Revenue",
      items: "Items Sold",
    },
    charts: {
      title: "Analytics",
      revenueOverTime: "Revenue Over Time",
      topProducts: "Top Products by Revenue",
      paymentSplit: "Payment Method Distribution",
    },
    payment: {
      unknown: "Unknown",
    },
    sales: {
      title: "Sales Detail",
      empty: "No sales found for the selected filters",
      export: "Export CSV",
      product: "Product",
      user: "User",
      quantity: "Qty",
      price: "Unit Price",
      total: "Total",
      paymentMethod: "Payment Method",
      date: "Date",
    },
    close: {
      modalTitle: "Confirm Shift Close",
      modalQuestion: "Are you sure you want to close the shift?",
      cancel: "Cancel",
      confirm: "Close Shift",
      confirming: "Closing...",
    },
  },
};

export default reportsEn;
