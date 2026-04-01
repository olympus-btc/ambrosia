"use client";

import { Card, CardBody, Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { RequirePermission } from "@/hooks/usePermission";

import { resolveRoleName } from "../utils/roleTemplates";

export function RolesCard({ role, canManageRoles, onEdit, onDelete }) {
  const t = useTranslations();

  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="flex flex-row items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-green-900 truncate">{resolveRoleName(role.role, t)}</p>
          <Chip
            size="sm"
            className={role.isAdmin
              ? "bg-green-200 text-xs text-green-800 border border-green-300 mt-1"
              : "mt-1 text-xs"
            }
            color={role.isAdmin ? undefined : "default"}
          >
            {role.isAdmin ? t("roles.labels.adminChip") : t("roles.labels.standardChip")}
          </Chip>
        </div>
        {canManageRoles && (
          <div className="flex gap-2 shrink-0">
            <RequirePermission allOf={["roles_update"]}>
              <EditButton aria-label="Edit Role" onPress={() => onEdit(role)} />
            </RequirePermission>
            <RequirePermission allOf={["roles_delete"]}>
              <DeleteButton aria-label="Delete Role" onPress={() => onDelete(role)} />
            </RequirePermission>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
