"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
} from "@heroui/react";
import { Pencil, Trash } from "lucide-react";
import { useTranslations } from "next-intl";

import { RequirePermission, usePermission } from "@/hooks/usePermission";

import { resolveRoleName } from "./utils/roleTemplates";

export function RolesTable({ roles, loading, onEdit, onDelete }) {
  const t = useTranslations();
  const canManageRoles = usePermission({ anyOf: ["roles_update", "roles_delete"] });

  if (loading) {
    return <p className="text-default-500">{t("roles.state.loading")}</p>;
  }

  if (roles.length === 0) {
    return <p className="text-default-500">{t("roles.state.empty")}</p>;
  }

  return (
    <section className="w-full overflow-x-auto">
      <Table className="min-w-[400px]" removeWrapper aria-label={t("roles.header.title")}>
        <TableHeader>
          <TableColumn className="py-2 px-3">{t("roles.columns.name")}</TableColumn>
          <TableColumn className="py-2 px-3">{t("roles.columns.description")}</TableColumn>
          <TableColumn className="py-2 px-3 w-24">{t("roles.columns.type")}</TableColumn>
          <TableColumn className={canManageRoles ? "py-2 px-3 w-24 text-right" : "hidden"}>
            {t("roles.columns.actions")}
          </TableColumn>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">{resolveRoleName(role.role, t)}</TableCell>
              <TableCell className="text-sm text-default-500">
                {role.isAdmin ? t("roles.labels.admin") : t("roles.labels.standard")}
              </TableCell>
              <TableCell>
                {role.isAdmin ? (
                  <Chip className="bg-green-200 text-xs text-green-800 border border-green-300" size="sm">
                    {t("roles.labels.adminChip")}
                  </Chip>
                ) : (
                  <Chip color="default" size="sm">
                    {t("roles.labels.standardChip")}
                  </Chip>
                )}
              </TableCell>
              <TableCell className={canManageRoles ? "py-2 px-3" : "hidden"}>
                <div className="flex justify-end gap-2">
                  <RequirePermission allOf={["roles_update"]}>
                    <Button
                      aria-label="Edit Role"
                      isIconOnly
                      size="sm"
                      className="text-xs text-white bg-blue-500"
                      onPress={() => onEdit(role)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </RequirePermission>
                  <RequirePermission allOf={["roles_delete"]}>
                    <Button
                      aria-label="Delete Role"
                      isIconOnly
                      size="sm"
                      color="danger"
                      className="text-xs text-white"
                      onPress={() => onDelete(role)}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </RequirePermission>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
