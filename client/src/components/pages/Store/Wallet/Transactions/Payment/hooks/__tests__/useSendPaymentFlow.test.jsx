import { act, renderHook, waitFor } from "@testing-library/react";

import * as walletService from "@/services/walletService";
import { I18nProvider } from "@i18n/I18nProvider";

import { useSendPaymentFlow } from "../useSendPaymentFlow";

function Wrapper({ children }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe("useSendPaymentFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(walletService, "decodeInvoice").mockResolvedValue({
      amountSat: 1200,
      description: "invoice",
    });
    jest.spyOn(walletService, "payInvoiceFromService").mockResolvedValue({
      recipientAmountSat: 1200,
      routingFeeSat: 6,
      paymentHash: "hash-123",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens the confirm modal after decoding a valid invoice", async () => {
    const { result } = renderHook(
      () => useSendPaymentFlow({}),
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.actions.updateInvoice("lnbc1000n1pj9h8uqpp5test");
    });

    let openResult;
    await act(async () => {
      openResult = await result.current.actions.openConfirm();
    });

    await waitFor(() => {
      expect(openResult).toEqual({
        status: "ready",
        decodedInvoice: {
          amountSat: 1200,
          description: "invoice",
        },
      });
      expect(walletService.decodeInvoice).toHaveBeenCalledWith("lnbc1000n1pj9h8uqpp5test");
      expect(result.current.isConfirmOpen).toBe(true);
      expect(result.current.decodedInvoice).toEqual({
        amountSat: 1200,
        description: "invoice",
      });
    });
  });

  it("confirms the payment and refreshes wallet data", async () => {
    const fetchInfo = jest.fn();
    const fetchTransactions = jest.fn();
    const { result } = renderHook(
      () => useSendPaymentFlow({ fetchInfo, fetchTransactions }),
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.actions.updateInvoice("lnbc1000n1pj9h8uqpp5test");
    });

    let paymentResult;
    await act(async () => {
      paymentResult = await result.current.actions.confirmPayment(null);
    });

    await waitFor(() => {
      expect(paymentResult).toEqual({
        status: "success",
        paymentResult: {
          recipientAmountSat: 1200,
          routingFeeSat: 6,
          paymentHash: "hash-123",
        },
      });
      expect(walletService.payInvoiceFromService).toHaveBeenCalledWith("lnbc1000n1pj9h8uqpp5test", null, expect.any(Object));
      expect(fetchInfo).toHaveBeenCalledTimes(1);
      expect(fetchTransactions).toHaveBeenCalledTimes(1);
      expect(result.current.payInvoice).toBe("");
      expect(result.current.paymentResult).toEqual({
        recipientAmountSat: 1200,
        routingFeeSat: 6,
        paymentHash: "hash-123",
      });
    });
  });

  it("stores inline validation errors instead of decoding invalid invoices", async () => {
    const { result } = renderHook(
      () => useSendPaymentFlow({}),
      { wrapper: Wrapper },
    );

    let openResult;
    await act(async () => {
      openResult = await result.current.actions.openConfirm();
    });

    await waitFor(() => {
      expect(openResult).toEqual({
        status: "validation_error",
        error: "payments.send.noInvoiceToPay",
      });
      expect(walletService.decodeInvoice).not.toHaveBeenCalled();
      expect(result.current.invoiceValidationError).toBe("payments.send.noInvoiceToPay");
      expect(result.current.isConfirmOpen).toBe(false);
    });
  });
});
