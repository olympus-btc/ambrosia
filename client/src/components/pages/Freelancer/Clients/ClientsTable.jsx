"use client";

import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { RequirePermission } from "@/hooks/usePermission";

import { formatClientHourlyRate, getClientCurrencyAcronym, getClientPaymentMethods } from "./clientFormatters";

const PAYMENT_METHOD_PREVIEW_LIMIT = 3;

export function ClientsTable({ clients, currencies, canManageClients, onDeleteClient, onEditClient }) {
  const clientTranslations = useTranslations("freelanceClients");

  return (
    <Table className="min-w-[700px]" removeWrapper aria-label={clientTranslations("tableAriaLabel")}>
      <TableHeader>
        <TableColumn className="py-2 px-3">{clientTranslations("name")}</TableColumn>
        <TableColumn className="py-2 px-3">{clientTranslations("hourlyRate")}</TableColumn>
        <TableColumn className="py-2 px-3">{clientTranslations("billingCycle")}</TableColumn>
        <TableColumn className="py-2 px-3">{clientTranslations("paymentMethod")}</TableColumn>
        <TableColumn className={canManageClients ? "py-2 px-3 w-40 text-right" : "hidden"}>
          {clientTranslations("actions")}
        </TableColumn>
      </TableHeader>
      <TableBody>
        {clients.map((client) => {
          const clientCurrencyAcronym = getClientCurrencyAcronym(client, currencies);
          const clientPaymentMethods = getClientPaymentMethods(client);
          const visiblePaymentMethods = clientPaymentMethods.slice(0, PAYMENT_METHOD_PREVIEW_LIMIT);
          const hiddenPaymentMethodCount = clientPaymentMethods.length - visiblePaymentMethods.length;

          return (
            <TableRow key={client.id}>
              <TableCell className="max-w-[220px] truncate">{client.name}</TableCell>
              <TableCell>{formatClientHourlyRate(client, clientCurrencyAcronym)}</TableCell>
              <TableCell>{clientTranslations(`billingCycles.${client.billingCycle}`)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
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
              </TableCell>
              <TableCell className={canManageClients ? "py-2 px-3" : "hidden"}>
                <div className="flex justify-end gap-2">
                  <RequirePermission allOf={["clients_update"]}>
                    <EditButton onPress={() => onEditClient(client)}>{clientTranslations("edit")}</EditButton>
                  </RequirePermission>
                  <RequirePermission allOf={["clients_delete"]}>
                    <DeleteButton onPress={() => onDeleteClient(client)}>{clientTranslations("delete")}</DeleteButton>
                  </RequirePermission>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
