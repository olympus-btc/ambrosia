"use client";

import { useState } from "react";

import { addToast, Button, Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionBlockedMessage } from "@/components/shared/PermissionBlockedMessage";
import { RequirePermission } from "@/hooks/usePermission";

import {
  useCurrencies,
  useFreelanceClients,
  useFreelanceInvoices,
  usePayoutAccounts,
} from "../hooks";

import { GenerateInvoiceModal } from "./GenerateInvoiceModal";
import { InvoiceDetailModal } from "./InvoiceDetailModal";
import { InvoicesList } from "./InvoicesList";

export function Invoices() {
  const invoiceTranslations = useTranslations("freelanceInvoices");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const {
    invoices,
    selectedInvoice,
    loading,
    loadingInvoiceDetail,
    forbidden,
    fetchInvoiceDetail,
    createFreelanceInvoice,
    previewFreelanceInvoice,
    clearSelectedInvoice,
  } = useFreelanceInvoices({ skipForbiddenRedirect: true });
  const { clients } = useFreelanceClients({ skipForbiddenRedirect: true });
  const { currencies } = useCurrencies({ skipForbiddenRedirect: true });
  const { payoutAccounts } = usePayoutAccounts({ skipForbiddenRedirect: true });

  const handleViewInvoice = async (invoice) => {
    setIsDetailModalOpen(true);
    await fetchInvoiceDetail(invoice.id);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    clearSelectedInvoice();
  };

  const handleGenerateInvoice = async (invoiceRequest) => {
    try {
      const createdInvoice = await createFreelanceInvoice(invoiceRequest);
      addToast({ description: invoiceTranslations("toasts.createSuccess"), color: "success" });
      setIsDetailModalOpen(true);
      await fetchInvoiceDetail(createdInvoice.id);
    } catch (createInvoiceError) {
      addToast({
        title: invoiceTranslations("toasts.createErrorTitle"),
        description: invoiceTranslations("toasts.createErrorDescription"),
        color: "danger",
      });
      throw createInvoiceError;
    }
  };

  const handlePreviewInvoice = async (invoiceRequest) => {
    try {
      return await previewFreelanceInvoice(invoiceRequest);
    } catch (previewInvoiceError) {
      addToast({
        title: invoiceTranslations("toasts.previewErrorTitle"),
        description: invoiceTranslations("toasts.previewErrorDescription"),
        color: "danger",
      });
      throw previewInvoiceError;
    }
  };

  if (forbidden) {
    return (
      <>
        <PageHeader title={invoiceTranslations("title")} subtitle={invoiceTranslations("subtitle")} />
        <PermissionBlockedMessage
          title={invoiceTranslations("permissionBlocked.title")}
          subtitle={invoiceTranslations("permissionBlocked.subtitle")}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={invoiceTranslations("title")}
        subtitle={invoiceTranslations("subtitle")}
        actions={(
          <RequirePermission allOf={["invoices_create", "clients_read"]}>
            <Button
              color="primary"
              className="bg-green-800"
              onPress={() => setIsGenerateModalOpen(true)}
              isDisabled={clients.length === 0}
            >
              {invoiceTranslations("generateInvoice")}
            </Button>
          </RequirePermission>
        )}
      />

      <div className="bg-white rounded-lg shadow-lg p-4 lg:p-8 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <InvoicesList invoices={invoices} onViewInvoice={handleViewInvoice} />
        )}
      </div>

      <InvoiceDetailModal
        invoice={selectedInvoice}
        isLoading={loadingInvoiceDetail}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />

      <GenerateInvoiceModal
        clients={clients}
        currencies={currencies}
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onPreview={handlePreviewInvoice}
        onSubmit={handleGenerateInvoice}
        payoutAccounts={payoutAccounts}
      />
    </>
  );
}
