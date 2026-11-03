"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { RequirePermission } from "@/hooks/usePermission";

import { resolveRoleName } from "../utils/roleTemplates";

export function RolesTable({ roles, canManageRoles, onEdit, onDelete }) {
  const roleTranslations = useTranslations();

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[400px]" removeWrapper aria-label={roleTranslations("roles.header.title")}>
        <TableHeader>
          <TableColumn className="py-2 px-3">{roleTranslations("roles.columns.name")}</TableColumn>
          <TableColumn className="py-2 px-3">{roleTranslations("roles.columns.description")}</TableColumn>
          <TableColumn className="py-2 px-3 w-24">{roleTranslations("roles.columns.type")}</TableColumn>
          <TableColumn className={canManageRoles ? "py-2 px-3 w-24 text-right" : "hidden"}>
            {roleTranslations("roles.columns.actions")}
          </TableColumn>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">{resolveRoleName(role.role, roleTranslations)}</TableCell>
              <TableCell className="text-sm text-default-500">
                {role.isAdmin ? roleTranslations("roles.labels.admin") : roleTranslations("roles.labels.standard")}
              </TableCell>
              <TableCell>
                {role.isAdmin ? (
                  <Chip className="bg-green-200 text-xs text-green-800 border border-green-300" size="sm">
                    {roleTranslations("roles.labels.adminChip")}
                  </Chip>
                ) : (
                  <Chip color="default" size="sm">
                    {roleTranslations("roles.labels.standardChip")}
                  </Chip>
                )}
              </TableCell>
              <TableCell className={canManageRoles ? "py-2 px-3" : "hidden"}>
                <div className="flex justify-end gap-2">
                  <RequirePermission allOf={["roles_update"]}>
                    <EditButton onPress={() => onEdit(role)}>{roleTranslations("roles.actions.edit")}</EditButton>
                  </RequirePermission>
                  <RequirePermission allOf={["roles_delete"]}>
                    <DeleteButton onPress={() => onDelete(role)}>{roleTranslations("roles.actions.delete")}</DeleteButton>
                  </RequirePermission>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
