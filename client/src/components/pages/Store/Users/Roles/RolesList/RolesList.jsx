"use client";

import { useTranslations } from "next-intl";

import { usePermission } from "@/hooks/usePermission";

import { RolesCard } from "./RolesCard";
import { RolesTable } from "./RolesTable";

export function RolesList({ roles, loading, onEdit, onDelete }) {
  const t = useTranslations();
  const canManageRoles = usePermission({ anyOf: ["roles_update", "roles_delete"] });

  if (loading) {
    return <p className="text-default-500">{t("roles.state.loading")}</p>;
  }

  if (roles.length === 0) {
    return <p className="text-default-500">{t("roles.state.empty")}</p>;
  }

  return (
    <section className="w-full">
      <div className="md:hidden space-y-3">
        {roles.map((role) => (
          <RolesCard
            key={role.id}
            role={role}
            canManageRoles={canManageRoles}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      <div className="hidden md:block">
        <RolesTable
          roles={roles}
          canManageRoles={canManageRoles}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </section>
  );
}
