"use client";

import { useCallback, useState } from "react";

import { addToast, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionBlockedMessage } from "@/components/shared/PermissionBlockedMessage";
import { RequirePermission } from "@/hooks/usePermission";

import { useRoles } from "./../hooks/useRoles";
import { useUsers } from "./../hooks/useUsers";
import { AddUsersModal } from "./AddUsersModal";
import { DeleteUsersModal } from "./DeleteUsersModal";
import { EditUsersModal } from "./EditUsersModal";
import { Roles } from "./Roles";
import { UsersList } from "./UsersList";

export function Users() {
  const [addUsersShowModal, setAddUsersShowModal] = useState(false);
  const [editUsersShowModal, setEditUsersShowModal] = useState(false);
  const [deleteUsersShowModal, setDeleteUsersShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteCurrentUserPin, setDeleteCurrentUserPin] = useState("");
  const { users, forbidden: usersForbidden, updateUser, addUser, deleteUser, refetch: refetchUsers } = useUsers({ skipForbiddenRedirect: true });
  const { roles, createRole, deleteRole: deleteRoleBase, loading: loadingRoles, updateRoleWithPermissions, getRolePermissions } = useRoles();

  const deleteRole = useCallback(async (roleId, currentUserPin) => {
    await deleteRoleBase(roleId, currentUserPin);
    await refetchUsers();
  }, [deleteRoleBase, refetchUsers]);

  const [data, setData] = useState({
    userId: "",
    userName: "",
    userPin: "",
    userPhone: "",
    userEmail: "",
    userRole: "",
    currentUserPin: "",
  });

  const handleEditUser = (user) => {
    setSelectedUser(user);

    setData({
      userId: user.id,
      userName: user.name ?? "",
      userPin: "",
      userPhone: user.phone ?? "",
      userEmail: user.email ?? "",
      userRole: user.roleId ?? "",
      currentUserPin: "",
    });

    setEditUsersShowModal(true);
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setDeleteCurrentUserPin("");
    setDeleteUsersShowModal(true);
  };

  const handleDataChange = (newData) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const userTranslations = useTranslations("users");

  if (usersForbidden) {
    return (
      <>
        <PageHeader title={userTranslations("title")} subtitle={userTranslations("subtitle")} />
        <PermissionBlockedMessage
          title={userTranslations("permissionBlocked.title")}
          subtitle={userTranslations("permissionBlocked.subtitle")}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={userTranslations("title")}
        subtitle={userTranslations("subtitle")}
        actions={(
          <RequirePermission allOf={["users_create"]}>
            <Button
              color="primary"
              className="bg-green-800"
              onPress={() => {
                setData({
                  userId: "",
                  userName: "",
                  userPin: "",
                  userPhone: "",
                  userEmail: "",
                  userRole: roles?.[0]?.id || "",
                  currentUserPin: "",
                });
                setAddUsersShowModal(true);
              }}
            >
              {userTranslations("addUser")}
            </Button>
          </RequirePermission>
        )}
      />
      <div className="bg-white rounded-lg shadow-lg p-4 lg:p-8 overflow-x-auto">
        <UsersList
          users={users}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
        />
      </div>
      <RequirePermission allOf={["roles_read"]}>
        <div className="mt-8">
          <Roles
            roles={roles}
            createRole={createRole}
            deleteRole={deleteRole}
            loading={loadingRoles}
            updateRoleWithPermissions={updateRoleWithPermissions}
            getRolePermissions={getRolePermissions}
          />
        </div>
      </RequirePermission>

      <AddUsersModal
        data={data}
        setData={setData}
        roles={roles}
        addUser={addUser}
        onChange={handleDataChange}
        addUsersShowModal={addUsersShowModal}
        setAddUsersShowModal={setAddUsersShowModal}
      />

      <EditUsersModal
        data={data}
        setData={setData}
        roles={roles}
        user={selectedUser}
        updateUser={updateUser}
        onChange={handleDataChange}
        editUsersShowModal={editUsersShowModal}
        setEditUsersShowModal={setEditUsersShowModal}
      />

      <DeleteUsersModal
        user={userToDelete}
        deleteUsersShowModal={deleteUsersShowModal}
        setDeleteUsersShowModal={setDeleteUsersShowModal}
        currentUserPin={deleteCurrentUserPin}
        setCurrentUserPin={setDeleteCurrentUserPin}
        onConfirm={async () => {
          try {
            if (userToDelete?.id) {
              await deleteUser(userToDelete.id, deleteCurrentUserPin);
              addToast({ description: userTranslations("toasts.deleteSuccess"), color: "success" });
            }
            setDeleteUsersShowModal(false);
            setDeleteCurrentUserPin("");
          } catch {
          }
        }}
      />
    </>
  );
}
