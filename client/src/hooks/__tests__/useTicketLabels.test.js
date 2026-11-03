import { renderHook } from "@testing-library/react";

import { useTicketLabels } from "../useTicketLabels";

jest.mock("next-intl", () => ({
  useTranslations: (namespace) => (key) => `${namespace}.${key}`,
}));

describe("useTicketLabels", () => {
  it("returns the translated labels printed on the ticket", () => {
    const { result: ticketLabelsHook } = renderHook(() => useTicketLabels());

    expect(ticketLabelsHook.current).toEqual({
      total: "ticketPrint.labels.total",
      discount: "ticketPrint.labels.discount",
      tip: "ticketPrint.labels.tip",
      paymentMethod: "ticketPrint.labels.paymentMethod",
    });
  });
});
