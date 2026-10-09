"use client";

import { useCallback, useEffect, useState } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

import { buildParsedHttpError } from "../../Store/utils/buildHttpError";

export function useFreelanceInvoices({ skipForbiddenRedirect = false } = {}) {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const invoicesResponse = await httpClient("/freelance/invoices", { skipForbiddenRedirect });
      setForbidden(invoicesResponse.status === 403);
      if (!invoicesResponse.ok) return;

      const invoicesData = await parseJsonResponse(invoicesResponse, []);
      setInvoices(toArray(invoicesData));
    } catch (loadInvoicesError) {
      setLoadError(loadInvoicesError);
    } finally {
      setLoading(false);
    }
  }, [skipForbiddenRedirect]);

  const fetchInvoiceDetail = useCallback(
    async (invoiceId) => {
      setLoadingInvoiceDetail(true);

      try {
        const invoiceDetailResponse = await httpClient(`/freelance/invoices/${invoiceId}`, {
          skipForbiddenRedirect: true,
        });

        if (invoiceDetailResponse.ok === false) {
          throw await buildParsedHttpError(invoiceDetailResponse, "Error loading freelance invoice");
        }

        const invoiceDetailData = await parseJsonResponse(invoiceDetailResponse, null);
        setSelectedInvoice(invoiceDetailData);
        return invoiceDetailData;
      } finally {
        setLoadingInvoiceDetail(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    selectedInvoice,
    loading,
    loadingInvoiceDetail,
    error: loadError,
    forbidden,
    refetch: fetchInvoices,
    fetchInvoiceDetail,
    clearSelectedInvoice: () => setSelectedInvoice(null),
  };
}
