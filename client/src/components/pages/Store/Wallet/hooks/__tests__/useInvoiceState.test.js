import { renderHook, act } from "@testing-library/react";

import { useInvoiceState } from "../useInvoiceState";

describe("useInvoiceState", () => {
  describe("Initial State", () => {
    it("returns initial state with default values", () => {
      const { result } = renderHook(() => useInvoiceState());

      expect(result.current.invoiceState).toEqual({
        created: null,
        paid: false,
        awaitingPayment: false,
        completedAt: null,
        showModal: false,
      });
    });

    it("returns actions object", () => {
      const { result } = renderHook(() => useInvoiceState());

      expect(result.current.actions).toHaveProperty("createInvoice");
      expect(result.current.actions).toHaveProperty("markAsPaid");
      expect(result.current.actions).toHaveProperty("closeModal");
      expect(result.current.actions).toHaveProperty("openModal");
      expect(result.current.actions).toHaveProperty("setAwaitingPayment");
      expect(result.current.actions).toHaveProperty("reset");
    });
  });

  describe("createInvoice", () => {
    it("sets invoice data and opens modal", () => {
      const { result } = renderHook(() => useInvoiceState());

      const invoice = {
        serialized: "lnbc1000n1...",
        paymentHash: "hash-123",
      };

      act(() => {
        result.current.actions.createInvoice(invoice);
      });

      expect(result.current.invoiceState).toEqual({
        created: invoice,
        paid: false,
        awaitingPayment: true,
        completedAt: null,
        showModal: true,
      });
    });

    it("sets awaitingPayment to true", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ test: "invoice" });
      });

      expect(result.current.invoiceState.awaitingPayment).toBe(true);
    });

    it("opens modal when creating invoice", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ test: "invoice" });
      });

      expect(result.current.invoiceState.showModal).toBe(true);
    });

    it("resets paid and completedAt when creating new invoice", () => {
      const { result } = renderHook(() => useInvoiceState());

      // First create and mark as paid
      act(() => {
        result.current.actions.createInvoice({ invoice: "1" });
      });

      act(() => {
        result.current.actions.markAsPaid(Date.now());
      });

      // Create new invoice
      act(() => {
        result.current.actions.createInvoice({ invoice: "2" });
      });

      expect(result.current.invoiceState.paid).toBe(false);
      expect(result.current.invoiceState.completedAt).toBeNull();
    });
  });

  describe("markAsPaid", () => {
    it("marks invoice as paid with completedAt timestamp", () => {
      const { result } = renderHook(() => useInvoiceState());

      const invoice = { serialized: "lnbc..." };
      const completedAt = Date.now();

      act(() => {
        result.current.actions.createInvoice(invoice);
      });

      act(() => {
        result.current.actions.markAsPaid(completedAt);
      });

      expect(result.current.invoiceState.paid).toBe(true);
      expect(result.current.invoiceState.completedAt).toBe(completedAt);
    });

    it("sets awaitingPayment to false when paid", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ invoice: "test" });
      });

      expect(result.current.invoiceState.awaitingPayment).toBe(true);

      act(() => {
        result.current.actions.markAsPaid(Date.now());
      });

      expect(result.current.invoiceState.awaitingPayment).toBe(false);
    });

    it("preserves created invoice when marking as paid", () => {
      const { result } = renderHook(() => useInvoiceState());

      const invoice = { serialized: "lnbc...", paymentHash: "hash" };

      act(() => {
        result.current.actions.createInvoice(invoice);
      });

      act(() => {
        result.current.actions.markAsPaid(Date.now());
      });

      expect(result.current.invoiceState.created).toEqual(invoice);
    });

    it("keeps modal open when marking as paid", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ invoice: "test" });
      });

      expect(result.current.invoiceState.showModal).toBe(true);

      act(() => {
        result.current.actions.markAsPaid(Date.now());
      });

      expect(result.current.invoiceState.showModal).toBe(true);
    });
  });

  describe("closeModal", () => {
    it("closes the modal", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ invoice: "test" });
      });

      expect(result.current.invoiceState.showModal).toBe(true);

      act(() => {
        result.current.actions.closeModal();
      });

      expect(result.current.invoiceState.showModal).toBe(false);
    });

    it("sets awaitingPayment to false", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ invoice: "test" });
      });

      act(() => {
        result.current.actions.closeModal();
      });

      expect(result.current.invoiceState.awaitingPayment).toBe(false);
    });

    it("resets completedAt to null", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ invoice: "test" });
      });

      act(() => {
        result.current.actions.markAsPaid(Date.now());
      });

      act(() => {
        result.current.actions.closeModal();
      });

      expect(result.current.invoiceState.completedAt).toBeNull();
    });

    it("preserves created invoice and paid status", () => {
      const { result } = renderHook(() => useInvoiceState());

      const invoice = { serialized: "lnbc..." };

      act(() => {
        result.current.actions.createInvoice(invoice);
      });

      act(() => {
        result.current.actions.markAsPaid(Date.now());
      });

      act(() => {
        result.current.actions.closeModal();
      });

      expect(result.current.invoiceState.created).toEqual(invoice);
      expect(result.current.invoiceState.paid).toBe(true);
    });
  });

  describe("openModal", () => {
    it("opens the modal", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.openModal();
      });

      expect(result.current.invoiceState.showModal).toBe(true);
    });

    it("preserves all other state when opening modal", () => {
      const { result } = renderHook(() => useInvoiceState());

      const invoice = { serialized: "lnbc..." };

      act(() => {
        result.current.actions.createInvoice(invoice);
      });

      act(() => {
        result.current.actions.markAsPaid(Date.now());
      });

      act(() => {
        result.current.actions.closeModal();
      });

      const stateBeforeOpen = { ...result.current.invoiceState };

      act(() => {
        result.current.actions.openModal();
      });

      expect(result.current.invoiceState.created).toEqual(stateBeforeOpen.created);
      expect(result.current.invoiceState.paid).toBe(stateBeforeOpen.paid);
      expect(result.current.invoiceState.awaitingPayment).toBe(stateBeforeOpen.awaitingPayment);
    });
  });

  describe("setAwaitingPayment", () => {
    it("sets awaitingPayment to true", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.setAwaitingPayment(true);
      });

      expect(result.current.invoiceState.awaitingPayment).toBe(true);
    });

    it("sets awaitingPayment to false", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ invoice: "test" });
      });

      expect(result.current.invoiceState.awaitingPayment).toBe(true);

      act(() => {
        result.current.actions.setAwaitingPayment(false);
      });

      expect(result.current.invoiceState.awaitingPayment).toBe(false);
    });

    it("preserves all other state when setting awaitingPayment", () => {
      const { result } = renderHook(() => useInvoiceState());

      const invoice = { serialized: "lnbc..." };

      act(() => {
        result.current.actions.createInvoice(invoice);
      });

      const stateBeforeChange = { ...result.current.invoiceState };

      act(() => {
        result.current.actions.setAwaitingPayment(false);
      });

      expect(result.current.invoiceState.created).toEqual(stateBeforeChange.created);
      expect(result.current.invoiceState.paid).toBe(stateBeforeChange.paid);
      expect(result.current.invoiceState.showModal).toBe(stateBeforeChange.showModal);
    });
  });

  describe("reset", () => {
    it("resets all state to initial values", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ invoice: "test" });
      });

      act(() => {
        result.current.actions.markAsPaid(Date.now());
      });

      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.invoiceState).toEqual({
        created: null,
        paid: false,
        awaitingPayment: false,
        completedAt: null,
        showModal: false,
      });
    });

    it("clears created invoice", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ invoice: "test" });
      });

      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.invoiceState.created).toBeNull();
    });

    it("resets paid status", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ invoice: "test" });
      });

      act(() => {
        result.current.actions.markAsPaid(Date.now());
      });

      expect(result.current.invoiceState.paid).toBe(true);

      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.invoiceState.paid).toBe(false);
    });

    it("closes modal on reset", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ invoice: "test" });
      });

      expect(result.current.invoiceState.showModal).toBe(true);

      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.invoiceState.showModal).toBe(false);
    });
  });

  describe("Complex Workflows", () => {
    it("handles full invoice lifecycle", () => {
      const { result } = renderHook(() => useInvoiceState());

      const invoice = { serialized: "lnbc...", paymentHash: "hash" };
      const completedAt = Date.now();

      // Create invoice
      act(() => {
        result.current.actions.createInvoice(invoice);
      });

      expect(result.current.invoiceState).toMatchObject({
        created: invoice,
        paid: false,
        awaitingPayment: true,
        showModal: true,
      });

      // Mark as paid
      act(() => {
        result.current.actions.markAsPaid(completedAt);
      });

      expect(result.current.invoiceState).toMatchObject({
        paid: true,
        awaitingPayment: false,
        completedAt,
      });

      // Close modal
      act(() => {
        result.current.actions.closeModal();
      });

      expect(result.current.invoiceState).toMatchObject({
        showModal: false,
        completedAt: null,
      });

      // Reset
      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.invoiceState).toMatchObject({
        created: null,
        paid: false,
      });
    });

    it("handles reopening modal after payment", () => {
      const { result } = renderHook(() => useInvoiceState());

      act(() => {
        result.current.actions.createInvoice({ invoice: "test" });
      });

      act(() => {
        result.current.actions.markAsPaid(Date.now());
      });

      act(() => {
        result.current.actions.closeModal();
      });

      expect(result.current.invoiceState.showModal).toBe(false);

      act(() => {
        result.current.actions.openModal();
      });

      expect(result.current.invoiceState.showModal).toBe(true);
      expect(result.current.invoiceState.paid).toBe(true);
    });
  });
});
