"use client";

import { Card, CardBody, Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import { resolveRoleName } from "@/components/pages/Store/Users/Roles/utils/roleTemplates";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { RequirePermission } from "@/hooks/usePermission";

export function UsersCard({ user, canManageUsers, onEditUser, onDeleteUser }) {
  const t = useTranslations();

  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="flex flex-row items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-green-900 truncate">{user.name}</p>
          {user.role ? (
            <Chip size="sm" className="bg-green-200 text-xs text-green-800 border border-green-300 mt-1">
              {resolveRoleName(user.role, t)}
            </Chip>
          ) : (
            <span className="text-xs text-default-400 italic">{t("users.noRole")}</span>
          )}
        </div>
        {canManageUsers && (
          <div className="flex gap-2 shrink-0">
            <RequirePermission allOf={["users_update"]}>
              <EditButton onPress={() => onEditUser(user)} />
            </RequirePermission>
            <RequirePermission allOf={["users_delete"]}>
              <DeleteButton onPress={() => onDeleteUser(user)} />
            </RequirePermission>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
