import { useMemo, useState } from "react";

export const useInvoiceState = () => {
  const [invoiceState, setInvoiceState] = useState({
    created: null,
    paid: false,
    awaitingPayment: false,
    completedAt: null,
    showModal: false,
  });

  const actions = useMemo(() => ({
    createInvoice: (invoice) => {
      setInvoiceState({
        created: invoice,
        paid: false,
        awaitingPayment: true,
        completedAt: null,
        showModal: true,
      });
    },

    markAsPaid: (completedAt) => {
      setInvoiceState((prev) => ({
        ...prev,
        paid: true,
        awaitingPayment: false,
        completedAt,
      }));
    },

    closeModal: () => {
      setInvoiceState({
        created: null,
        paid: false,
        awaitingPayment: false,
        completedAt: null,
        showModal: false,
      });
    },

    openModal: () => {
      setInvoiceState((prev) => ({
        ...prev,
        showModal: true,
      }));
    },

    setAwaitingPayment: (isAwaiting) => {
      setInvoiceState((prev) => ({
        ...prev,
        awaitingPayment: isAwaiting,
      }));
    },

    reset: () => {
      setInvoiceState({
        created: null,
        paid: false,
        awaitingPayment: false,
        completedAt: null,
        showModal: false,
      });
    },
  }), []);

  return { invoiceState, actions };
};
