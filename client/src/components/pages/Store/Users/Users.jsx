"use client";

import { useState } from "react";

import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { StoreLayout } from "../StoreLayout";

import { useRoles } from "./../hooks/useRoles";
import { useUsers } from "./../hooks/useUsers";
import { AddUsersModal } from "./AddUsersModal";
import { DeleteUsersModal } from "./DeleteUsersModal";
import { EditUsersModal } from "./EditUsersModal";
import { UsersTable } from "./UsersTable";

export function Users() {
  const [addUsersShowModal, setAddUsersShowModal] = useState(false);
  const [editUsersShowModal, setEditUsersShowModal] = useState(false);
  const [deleteUsersShowModal, setDeleteUsersShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const { users, updateUser, addUser, deleteUser } = useUsers();
  const { roles } = useRoles();

  const [data, setData] = useState({
    userId: "",
    userName: "",
    userPin: "",
    userPhone: "",
    userEmail: "",
    userRole: "",
  });

  const handleEditUser = (user) => {
    setSelectedUser(user);

    setData({
      userId: user.id,
      userName: user.name ?? "",
      userPin: "",
      userPhone: user.phone ?? "",
      userEmail: user.email ?? "",
      userRole: user.role_id ?? "",
    });

    setEditUsersShowModal(true);
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setDeleteUsersShowModal(true);
  };

  const handleDataChange = (newData) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const t = useTranslations("users");

  return (
    <StoreLayout>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-semibold text-green-900">{t("title")}</h1>
          <p className="text-gray-800 mt-4">
            {t("subtitle")}
          </p>
        </div>
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
            });
            setAddUsersShowModal(true);
          }}
        >
          {t("addUser")}
        </Button>
      </header>
      <div className="bg-white rounded-lg shadow-lg p-4 lg:p-8 overflow-x-auto">
        <UsersTable
          users={users}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
        />
      </div>

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
        onConfirm={async () => {
          if (userToDelete?.id) {
            await deleteUser(userToDelete.id);
          }
          setDeleteUsersShowModal(false);
        }}
      />
    </StoreLayout>
  );
}
