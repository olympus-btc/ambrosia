"use client";

export const sampleTicket = {
  ticketId: "123",
  tableName: "Mesa 4",
  roomName: "Salon",
  date: "2024-01-10 19:30",
  items: [
    { quantity: 2, name: "Tacos al pastor", price: 90, comments: ["sin cebolla"] },
    { quantity: 1, name: "Agua fresca", price: 35, comments: [] },
  ],
  total: 215,
  invoice: "lnbc10u1p0exampleinvoice",
};

export const sampleConfig = {
  businessName: "Ambrosia",
  businessAddress: "Calle Principal 123",
  businessPhone: "+52 555 1234567",
};
