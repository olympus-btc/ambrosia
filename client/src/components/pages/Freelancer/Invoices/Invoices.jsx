"use client";

import { useState } from "react";

import { Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionBlockedMessage } from "@/components/shared/PermissionBlockedMessage";

import { useFreelanceInvoices } from "../hooks";

import { InvoiceDetailModal } from "./InvoiceDetailModal";
import { InvoicesList } from "./InvoicesList";

export function Invoices() {
  const invoiceTranslations = useTranslations("freelanceInvoices");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const {
    invoices,
    selectedInvoice,
    loading,
    loadingInvoiceDetail,
    forbidden,
    fetchInvoiceDetail,
    clearSelectedInvoice,
  } = useFreelanceInvoices({ skipForbiddenRedirect: true });

  const handleViewInvoice = async (invoice) => {
    setIsDetailModalOpen(true);
    await fetchInvoiceDetail(invoice.id);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    clearSelectedInvoice();
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
      <PageHeader title={invoiceTranslations("title")} subtitle={invoiceTranslations("subtitle")} />

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
    </>
  );
}
