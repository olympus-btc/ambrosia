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

  const createFreelanceInvoice = useCallback(
    async (invoiceRequest) => {
      const createInvoiceResponse = await httpClient("/freelance/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceRequest),
        skipForbiddenRedirect: true,
      });

      if (createInvoiceResponse.ok === false) {
        throw await buildParsedHttpError(createInvoiceResponse, "Error creating freelance invoice");
      }

      const createdInvoiceData = await parseJsonResponse(createInvoiceResponse, {});
      await fetchInvoices();
      return createdInvoiceData;
    },
    [fetchInvoices],
  );

  const previewFreelanceInvoice = useCallback(async (invoiceRequest) => {
    const previewInvoiceResponse = await httpClient("/freelance/invoices/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoiceRequest),
      skipForbiddenRedirect: true,
    });

    if (previewInvoiceResponse.ok === false) {
      throw await buildParsedHttpError(previewInvoiceResponse, "Error previewing freelance invoice");
    }

    return await parseJsonResponse(previewInvoiceResponse, {});
  }, []);

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
    createFreelanceInvoice,
    previewFreelanceInvoice,
    clearSelectedInvoice: () => setSelectedInvoice(null),
  };
}
