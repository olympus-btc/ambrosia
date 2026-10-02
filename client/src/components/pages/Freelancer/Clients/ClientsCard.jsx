"use client";

import { Card, CardBody, Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { RequirePermission } from "@/hooks/usePermission";

import { formatClientHourlyRate, getClientCurrencyAcronym, getClientPaymentMethods } from "./clientFormatters";

const PAYMENT_METHOD_PREVIEW_LIMIT = 3;

export function ClientsCard({ client, currencies, canManageClients, onDeleteClient, onEditClient }) {
  const clientTranslations = useTranslations("freelanceClients");
  const clientCurrencyAcronym = getClientCurrencyAcronym(client, currencies);
  const clientPaymentMethods = getClientPaymentMethods(client);
  const visiblePaymentMethods = clientPaymentMethods.slice(0, PAYMENT_METHOD_PREVIEW_LIMIT);
  const hiddenPaymentMethodCount = clientPaymentMethods.length - visiblePaymentMethods.length;

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
              {clientTranslations(`billingCycles.${client.billingCycle}`)}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {visiblePaymentMethods.map((paymentMethod) => (
                <Chip
                  key={paymentMethod}
                  size="sm"
                  className="bg-green-200 text-xs text-green-800 border border-green-300"
                >
                  {clientTranslations(`paymentMethods.${paymentMethod}`)}
                </Chip>
              ))}
              {hiddenPaymentMethodCount > 0 && (
                <Chip size="sm" className="bg-gray-200 text-xs text-gray-600 border border-gray-300">
                  {clientTranslations("morePaymentMethods", { count: hiddenPaymentMethodCount })}
                </Chip>
              )}
            </div>
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
