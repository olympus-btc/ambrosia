export const freelanceReportFixture = {
  from: "2026-10-01",
  to: "2026-10-31",
  currencies: [
    {
      currencyId: "currency-eur",
      currencyAcronym: "EUR",
      totalDurationMinutes: 60,
      totalAmountCents: 5000,
      projects: [{
        projectId: "project-bob",
        projectName: "Bob App",
        clientId: "client-bob",
        clientName: "Bob",
        durationMinutes: 60,
        amountCents: 5000,
        tasks: [{ taskId: "task-review", taskName: "Review", durationMinutes: 60, amountCents: 5000 }],
      }],
    },
    {
      currencyId: "currency-usd",
      currencyAcronym: "USD",
      totalDurationMinutes: 150,
      totalAmountCents: 25000,
      projects: [{
        projectId: "project-alice",
        projectName: "Alice Website",
        clientId: "client-alice",
        clientName: "Alice",
        durationMinutes: 150,
        amountCents: 25000,
        tasks: [
          { taskId: "task-design", taskName: "Design", durationMinutes: 60, amountCents: 10000 },
          { taskId: "task-development", taskName: "Development", durationMinutes: 90, amountCents: 15000 },
        ],
      }],
    },
  ],
};

export const summaryTranslationsFixture = {
  currencyTotal: (currencyAcronym) => `Total ${currencyAcronym}`,
  totalDuration: "Total time",
  totalSatoshis: "Total in sats",
  satsCalculating: "Calculating",
  satsUnavailable: "Not available",
};
