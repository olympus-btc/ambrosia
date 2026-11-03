export const sampleTicket = {
  ticketId: "123",
  tableName: "Table 4",
  roomName: "Main Hall",
  date: "2024-01-10 19:30",
  items: [
    { quantity: 2, name: "Burger", price: 90, comments: ["no onion"] },
    { quantity: 1, name: "Lemonade", price: 35, comments: [] },
  ],
  total: 215,
  invoice: "lnbc10u1p0exampleinvoice",
  paymentMethod: "Cash",
};

export const sampleShiftReport = {
  cashierName: "Ana",
  openedAt: "2024-01-10T08:00:00",
  closedAt: "2024-01-10T18:05:00",
  breakdown: {
    shiftId: "sample-shift",
    initialAmount: 100,
    finalAmount: 395,
    difference: 5,
    totalSales: 420,
    totalTips: 25,
    cashSales: 300,
    cashRefunds: 10,
    expectedTotal: 390,
    totalTickets: 12,
    byPaymentMethod: [
      { name: "Cash", total: 300 },
      { name: "Credit Card", total: 120 },
    ],
  },
};

export const sampleConfig = {
  businessName: "Ambrosia",
  businessAddress: "Calle Principal 123",
  businessPhone: "+52 555 1234567",
};
