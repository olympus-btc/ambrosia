"use client";

import {
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

import { formatClientHourlyRate, getClientCurrencyAcronym } from "./clientFormatters";

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

          return (
            <TableRow key={client.id}>
              <TableCell className="max-w-[220px] truncate">{client.name}</TableCell>
              <TableCell>{formatClientHourlyRate(client, clientCurrencyAcronym)}</TableCell>
              <TableCell>{clientTranslations(`billingCycles.${client.billingCycle}`)}</TableCell>
              <TableCell>{clientTranslations(`paymentMethods.${client.paymentMethod}`)}</TableCell>
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
