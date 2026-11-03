"use client";

import { useTranslations } from "next-intl";

import { usePermission } from "@/hooks/usePermission";

import { ClientsCard } from "./ClientsCard";
import { ClientsTable } from "./ClientsTable";

export function ClientsList({ clients, currencies, onDeleteClient, onEditClient }) {
  const clientTranslations = useTranslations("freelanceClients");
  const canManageClients = usePermission({ anyOf: ["clients_update", "clients_delete"] });

  if (clients.length === 0) {
    return <p className="text-center text-gray-500 py-12">{clientTranslations("emptyState")}</p>;
  }

  return (
    <section className="w-full">
      <div className="md:hidden space-y-3">
        {clients.map((client) => (
          <ClientsCard
            key={client.id}
            client={client}
            currencies={currencies}
            canManageClients={canManageClients}
            onDeleteClient={onDeleteClient}
            onEditClient={onEditClient}
          />
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <ClientsTable
          clients={clients}
          currencies={currencies}
          canManageClients={canManageClients}
          onDeleteClient={onDeleteClient}
          onEditClient={onEditClient}
        />
      </div>
    </section>
  );
}
