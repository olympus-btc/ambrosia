const reportsEn = {
  reports: {
    header: {
      title: "Sales Reports",
      subtitle: "Product sales analysis",
      back: "Home",
      refreshAria: "Refresh data",
    },
    dates: {
      title: "Select Period",
      period: {
        week: "This Week",
        month: "This Month",
        year: "This Year",
      },
      startLabel: "Start Date",
      endLabel: "End Date",
      generate: "Generate Report",
      generating: "Generating...",
    },
    filters: {
      productName: "Product Name",
      productNamePlaceholder: "Search by product...",
      paymentMethod: "Payment Method",
      paymentMethodPlaceholder: "e.g. Efectivo, BTC...",
      clear: "Clear filters",
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
      generatedTitle: "Report generated",
      generatedDesc: "The report was generated successfully",
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
    sales: {
      title: "Sales Detail",
      empty: "No sales found for the selected filters",
      quantity: "Qty",
      price: "Unit Price",
      total: "Total",
    },
    close: {
      sectionTitle: "Close shift",
      sectionSubtitle: "End the day and consolidate movements for the selected period.",
      balanceLabel: "Balance:",
      modalTitle: "Confirm Shift Close",
      modalQuestion: "Are you sure you want to close the shift?",
      modalDesc: "This action will finish the current shift. Ensure all operations are complete.",
      modalPeriodBalance: "Period balance:",
      cancel: "Cancel",
      confirm: "Close Shift",
      confirming: "Closing...",
    },
  },
};

export default reportsEn;
