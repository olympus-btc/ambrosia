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
      subtitle: "Consolidated totals for the selected period",
      revenue: "Total Revenue",
      items: "Items Sold",
    },
    charts: {
      title: "Analytics",
      subtitle: "Visualize revenue trends and sales distribution",
      revenueOverTime: "Revenue Over Time",
      topProducts: "Top Products by Revenue",
      paymentSplit: "Payment Method Distribution",
    },
    payment: {
      unknown: "Unknown",
    },
    sales: {
      title: "Sales Detail",
      subtitle: "Complete transaction log for the selected period",
      empty: "No sales found for the selected filters",
      export: "Export CSV",
      product: "Product",
      user: "User",
      quantity: "Qty",
      price: "Unit Price",
      total: "Total",
      paymentMethod: "Payment Method",
      date: "Date",
      rowsPerPage: "Rows per page",
      paginationAria: "Sales pagination",
      tableAriaLabel: "Sales detail",
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
