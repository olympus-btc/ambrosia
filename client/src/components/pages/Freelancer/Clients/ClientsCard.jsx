"use client";

import { Card, CardBody } from "@heroui/react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { RequirePermission } from "@/hooks/usePermission";

import { formatClientHourlyRate, getClientCurrencyAcronym } from "./clientFormatters";

export function ClientsCard({ client, currencies, canManageClients, onDeleteClient, onEditClient }) {
  const clientTranslations = useTranslations("freelanceClients");
  const clientCurrencyAcronym = getClientCurrencyAcronym(client, currencies);

  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{client.name}</p>
            <p className="text-xs text-gray-500">
              {formatClientHourlyRate(client, clientCurrencyAcronym)} / {clientTranslations("hour")}
            </p>
            <p className="text-xs text-gray-500">
              {clientTranslations(`billingCycles.${client.billingCycle}`)} · {clientTranslations(`paymentMethods.${client.paymentMethod}`)}
            </p>
          </div>
          {canManageClients && (
            <div className="flex gap-2 shrink-0">
              <RequirePermission allOf={["clients_update"]}>
                <EditButton onPress={() => onEditClient(client)} />
              </RequirePermission>
              <RequirePermission allOf={["clients_delete"]}>
                <DeleteButton onPress={() => onDeleteClient(client)} />
              </RequirePermission>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
