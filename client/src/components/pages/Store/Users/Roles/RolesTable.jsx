"use client";

import { Button, Chip } from "@heroui/react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { RequirePermission } from "@/hooks/usePermission";

import { resolveRoleName } from "./utils/roleTemplates";

export function RolesTable({ roles, loading, onEdit, onDelete }) {
  const t = useTranslations();

  if (loading) {
    return <p className="text-default-500">{t("roles.state.loading")}</p>;
  }

  if (roles.length === 0) {
    return <p className="text-default-500">{t("roles.state.empty")}</p>;
  }

  return (
    <div className="space-y-3">
      {roles.map((role) => (
        <div
          key={role.id}
          className="flex items-center justify-between rounded-xl border border-default-200 px-5 py-4 bg-default-50 hover:bg-default-100 transition-colors"
        >
          <div className="flex flex-col gap-0.5">
            <p className="font-semibold text-foreground">{resolveRoleName(role.role, t)}</p>
            <p className="text-sm text-default-500">
              {role.isAdmin ? t("roles.labels.admin") : t("roles.labels.standard")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {role.isAdmin ? (
              <Chip className="bg-green-200 text-xs text-green-800 border border-green-300" size="sm">
                {t("roles.labels.adminChip")}
              </Chip>
            ) : (
              <Chip color="default" size="sm">
                {t("roles.labels.standardChip")}
              </Chip>
            )}
            <RequirePermission allOf={["roles_update"]}>
              <Button
                variant="light"
                size="sm"
                startContent={<Pencil className="w-4 h-4" />}
                onPress={() => onEdit(role)}
              >
                {t("roles.actions.edit")}
              </Button>
            </RequirePermission>
            <RequirePermission allOf={["roles_delete"]}>
              <Button
                variant="light"
                color="danger"
                size="sm"
                startContent={<Trash2 className="w-4 h-4" />}
                onPress={() => onDelete(role)}
              >
                {t("roles.actions.delete")}
              </Button>
            </RequirePermission>
          </div>
        </div>
      ))}
    </div>
  );
}
