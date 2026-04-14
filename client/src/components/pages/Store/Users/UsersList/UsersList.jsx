"use client";

import { usePermission } from "@/hooks/usePermission";

import { UsersCard } from "./UsersCard";
import { UsersTable } from "./UsersTable";

export function UsersList({ users, onEditUser, onDeleteUser }) {
  const canManageUsers = usePermission({ anyOf: ["users_update", "users_delete"] });

  return (
    <section className="w-full">
      <div className="md:hidden space-y-3">
        {users.map((user) => (
          <UsersCard
            key={user.id}
            user={user}
            canManageUsers={canManageUsers}
            onEditUser={onEditUser}
            onDeleteUser={onDeleteUser}
          />
        ))}
      </div>

      <div className="hidden md:block">
        <UsersTable
          users={users}
          canManageUsers={canManageUsers}
          onEditUser={onEditUser}
          onDeleteUser={onDeleteUser}
        />
      </div>
    </section>
  );
}
