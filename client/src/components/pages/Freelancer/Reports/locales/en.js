const freelanceReportsEn = {
  freelanceReports: {
    title: "Reports",
    subtitle: "Review billable time by project and task for a period.",
    exportCsv: "Export CSV",
    exportPdf: "Export PDF",
    periodFilterSubtitle: "Filter billable time by period",
    emptyState: "No billable time in this period.",
    loadError: "The report could not be loaded. Please try again.",
    permissionBlocked: {
      title: "You can't view reports",
      subtitle: "Ask an administrator to grant you the View freelance reports permission.",
    },
    projectsTitle: "Projects",
    records: "records",
    tableAriaLabel: "Freelance report table",
    projectTask: "Project / Task",
    project: "Project",
    task: "Task",
    client: "Client",
    duration: "Duration",
    amount: "Amount",
    filters: {
      search: "Search",
      searchPlaceholder: "Project, task or client",
      client: "Client",
      project: "Project",
      allClients: "All clients",
      allProjects: "All projects",
    },
    charts: {
      durationByProject: "Time by project",
      durationByClient: "Time by client",
      durationByTask: "Time by task",
    },
    summary: {
      currencyTotal: "Total {currency}",
      totalDuration: "Total time",
      totalSatoshis: "Total in sats",
      satsCalculating: "Calculating…",
      satsUnavailable: "Not available",
    },
    document: {
      reportTitle: "Billing report",
      businessFallbackName: "Business",
      period: "Period",
      projects: "Projects",
    },
    toasts: {
      exportCsvError: "The CSV report could not be exported.",
      exportPdfError: "The PDF report could not be opened. Allow pop-ups and try again.",
    },
  },
};

export default freelanceReportsEn;
