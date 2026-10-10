"use client";

import { useTranslations } from "next-intl";

import { RolesCard } from "./RolesCard";
import { RolesTable } from "./RolesTable";

export function RolesList({ roles, loading, canManageRoles = false, onEdit, onDelete }) {
  const roleTranslations = useTranslations();

  if (loading) {
    return <p className="text-default-500">{roleTranslations("roles.state.loading")}</p>;
  }

  if (roles.length === 0) {
    return <p className="text-default-500">{roleTranslations("roles.state.empty")}</p>;
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
