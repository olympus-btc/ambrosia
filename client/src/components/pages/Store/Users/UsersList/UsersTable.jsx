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

import { resolveRoleName } from "@/components/pages/Store/Users/Roles/utils/roleTemplates";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { RequirePermission } from "@/hooks/usePermission";

export function UsersTable({ users, canManageUsers, onEditUser, onDeleteUser }) {
  const t = useTranslations();

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[400px]" removeWrapper>
        <TableHeader>
          <TableColumn className="py-2 px-3 w-[120px]">{t("users.name")}</TableColumn>
          <TableColumn className="py-2 px-3 w-20">{t("users.role")}</TableColumn>
          <TableColumn className="py-2 px-3 w-[150px]">{t("users.email")}</TableColumn>
          <TableColumn className="py-2 px-3 w-[100px]">{t("users.phone")}</TableColumn>
          <TableColumn className={canManageUsers ? "py-2 px-3 w-[100px] text-right" : "hidden"}>{t("users.actions")}</TableColumn>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="max-w-[120px] truncate">{user.name}</TableCell>
              <TableCell>
                {user.role ? (
                  <Chip className="bg-green-200 text-xs text-green-800 border border-green-300">
                    {resolveRoleName(user.role, t)}
                  </Chip>
                ) : (
                  <span className="text-xs text-default-400 italic">{t("users.noRole")}</span>
                )}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">{user.email}</TableCell>
              <TableCell className="max-w-[100px] truncate">{user.phone}</TableCell>
              <TableCell className={canManageUsers ? "py-2 px-3" : "hidden"}>
                <div className="flex justify-end gap-2">
                  <RequirePermission allOf={["users_update"]}>
                    <EditButton onPress={() => onEditUser(user)} />
                  </RequirePermission>
                  <RequirePermission allOf={["users_delete"]}>
                    <DeleteButton onPress={() => onDeleteUser(user)} />
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
