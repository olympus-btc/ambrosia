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
} from "../hooks";

import { ClientFormModal } from "./ClientFormModal";
import { ClientsList } from "./ClientsList";
import { DeleteClientModal } from "./DeleteClientModal";

const EMPTY_CLIENT_FORM = {
  id: "",
  name: "",
  currencyId: "",
  hourlyRateCents: 0,
  billingCycle: "monthly",
  paymentMethods: ["bank"],
};

function toClientRequest(clientForm) {
  return {
    name: clientForm.name.trim(),
    currencyId: clientForm.currencyId,
    hourlyRateCents: clientForm.hourlyRateCents,
    billingCycle: clientForm.billingCycle,
    paymentMethods: clientForm.paymentMethods,
  };
}

export function Clients() {
  const clientTranslations = useTranslations("freelanceClients");
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT_FORM);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [formMode, setFormMode] = useState("add");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const {
    clients,
    loading: clientsLoading,
    forbidden: clientsForbidden,
    createFreelanceClient,
    updateFreelanceClient,
    deleteFreelanceClient,
  } = useFreelanceClients({ skipForbiddenRedirect: true });
  const { currencies, loading: currenciesLoading } = useCurrencies({ skipForbiddenRedirect: true });

  const handleClientFormChange = (clientFormUpdates) => {
    setClientForm((previousClientForm) => ({ ...previousClientForm, ...clientFormUpdates }));
  };

  const openAddClientModal = () => {
    setClientForm({
      ...EMPTY_CLIENT_FORM,
      currencyId: currencies[0]?.id || "",
    });
    setFormMode("add");
    setIsFormModalOpen(true);
  };

  const openEditClientModal = (client) => {
    setClientForm({
      id: client.id,
      name: client.name ?? "",
      currencyId: client.currencyId ?? "",
      hourlyRateCents: client.hourlyRateCents ?? 0,
      billingCycle: client.billingCycle ?? "monthly",
      paymentMethods: client.paymentMethods?.length ? client.paymentMethods : [client.paymentMethod ?? "bank"],
    });
    setFormMode("edit");
    setIsFormModalOpen(true);
  };

  const openDeleteClientModal = (client) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const handleSubmitClient = async (submittedClientForm) => {
    try {
      if (formMode === "edit") {
        await updateFreelanceClient(submittedClientForm.id, toClientRequest(submittedClientForm));
        addToast({ description: clientTranslations("toasts.updateSuccess"), color: "success" });
        return;
      }

      await createFreelanceClient(toClientRequest(submittedClientForm));
      addToast({ description: clientTranslations("toasts.createSuccess"), color: "success" });
    } catch (clientMutationError) {
      addToast({
        title: clientTranslations("toasts.saveErrorTitle"),
        description: clientTranslations("toasts.saveErrorDescription"),
        color: "danger",
      });
      throw clientMutationError;
    }
  };

  const handleConfirmDeleteClient = async () => {
    try {
      if (clientToDelete?.id) {
        await deleteFreelanceClient(clientToDelete.id);
        addToast({ description: clientTranslations("toasts.deleteSuccess"), color: "success" });
      }
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    } catch (deleteClientError) {
      addToast({
        title: clientTranslations("toasts.deleteErrorTitle"),
        description: clientTranslations("toasts.deleteErrorDescription"),
        color: "danger",
      });
      throw deleteClientError;
    }
  };

  if (clientsForbidden) {
    return (
      <>
        <PageHeader title={clientTranslations("title")} subtitle={clientTranslations("subtitle")} />
        <PermissionBlockedMessage
          title={clientTranslations("permissionBlocked.title")}
          subtitle={clientTranslations("permissionBlocked.subtitle")}
        />
      </>
    );
  }

  const isLoading = clientsLoading || currenciesLoading;

  return (
    <>
      <PageHeader
        title={clientTranslations("title")}
        subtitle={clientTranslations("subtitle")}
        actions={(
          <RequirePermission allOf={["clients_create"]}>
            <Button color="primary" className="bg-green-800" onPress={openAddClientModal}>
              {clientTranslations("addClient")}
            </Button>
          </RequirePermission>
        )}
      />

      <div className="bg-white rounded-lg shadow-lg p-4 lg:p-8 overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <ClientsList
            clients={clients}
            currencies={currencies}
            onDeleteClient={openDeleteClientModal}
            onEditClient={openEditClientModal}
          />
        )}
      </div>

      <ClientFormModal
        clientForm={clientForm}
        currencies={currencies}
        isOpen={isFormModalOpen}
        mode={formMode}
        onChange={handleClientFormChange}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleSubmitClient}
      />

      <DeleteClientModal
        client={clientToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteClient}
      />
    </>
  );
}
