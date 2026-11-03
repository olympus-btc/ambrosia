import { renderHook } from "@testing-library/react";

import { useSampleTicket } from "../useSampleTicket";

jest.mock("next-intl", () => ({
  useTranslations: (namespace) => (key) => `${namespace}.${key}`,
}));

describe("useSampleTicket", () => {
  it("translates the sample table, room, items and payment method", () => {
    const { result: sampleTicketHook } = renderHook(() => useSampleTicket());

    expect(sampleTicketHook.current).toEqual(expect.objectContaining({
      tableName: "ticketPrint.sample.tableName",
      roomName: "ticketPrint.sample.roomName",
      paymentMethod: "paymentMethods.cash",
      items: [
        { quantity: 2, name: "ticketPrint.sample.burger", price: 90, comments: ["ticketPrint.sample.noOnion"] },
        { quantity: 1, name: "ticketPrint.sample.lemonade", price: 35, comments: [] },
      ],
    }));
  });

  it("includes the translated ticket labels so the test print sends them", () => {
    const { result: sampleTicketHook } = renderHook(() => useSampleTicket());

    expect(sampleTicketHook.current.labels).toEqual({
      total: "ticketPrint.labels.total",
      discount: "ticketPrint.labels.discount",
      tip: "ticketPrint.labels.tip",
      paymentMethod: "ticketPrint.labels.paymentMethod",
    });
  });
});
