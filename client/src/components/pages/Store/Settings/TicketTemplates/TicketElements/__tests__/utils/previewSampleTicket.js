export const previewSampleTicket = {
  ticketId: "123",
  tableName: "Mesa 4",
  roomName: "Salón principal",
  date: "2024-01-10 19:30",
  items: [
    { quantity: 2, name: "Piña colada", price: 90, comments: ["sin azúcar"] },
    { quantity: 1, name: "Limonada", price: 35, comments: [] },
  ],
  total: 215,
  invoice: "lnbc10u1p0exampleinvoice",
  paymentMethod: "Tarjeta de débito",
  labels: {
    total: "TOTAL",
    discount: "DESCUENTO",
    tip: "PROPINA",
    paymentMethod: "METODO DE PAGO",
  },
};
