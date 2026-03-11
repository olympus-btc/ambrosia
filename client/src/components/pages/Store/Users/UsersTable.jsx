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

export function UsersTable({ users, onEditUser, onDeleteUser }) {
  const t = useTranslations("users");
  const canManageUsers = usePermission({ anyOf: ["users_update", "users_delete"] });

  return (
    <section className="w-full overflow-x-auto">
      <Table
        className="min-w-[400px]"
        removeWrapper
      >
        <TableHeader>
          <TableColumn className="py-2 px-3 w-[120px]">{t("name")}</TableColumn>
          <TableColumn className="py-2 px-3 w-20">{t("role")}</TableColumn>
          <TableColumn className="py-2 px-3 w-[150px]">{t("email")}</TableColumn>
          <TableColumn className="py-2 px-3 w-[100px]">{t("phone")}</TableColumn>
          <TableColumn className={canManageUsers ? "py-2 px-3 w-[100px] text-right" : "hidden"}>{t("actions")}</TableColumn>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
            >
              <TableCell className="max-w-[120px] truncate">{user.name}</TableCell>
              <TableCell>
                {user.role ? (
                  <Chip className="bg-green-200 text-xs text-green-800 border border-green-300">
                    {user.role}
                  </Chip>
                ) : (
                  <span className="text-xs text-default-400 italic">{t("noRole")}</span>
                )}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">{user.email}</TableCell>
              <TableCell className="max-w-[100px] truncate">{user.phone}</TableCell>
              <TableCell className={canManageUsers ? "py-2 px-3" : "hidden"}>
                <div className="flex justify-end gap-2">
                  <RequirePermission allOf={["users_update"]}>
                    <Button
                      aria-label="Edit User"
                      isIconOnly
                      size="sm"
                      className="text-xs text-white bg-blue-500"
                      onPress={() => onEditUser(user)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </RequirePermission>
                  <RequirePermission allOf={["users_delete"]}>
                    <Button
                      aria-label="Delete User"
                      isIconOnly
                      size="sm"
                      color="danger"
                      className="text-xs text-white"
                      onPress={() => onDeleteUser(user)}
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
