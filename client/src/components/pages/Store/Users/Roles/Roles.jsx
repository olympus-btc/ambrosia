"use client";

import { useMemo, useState } from "react";

import { addToast, Button, Card, CardBody, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { usePermissions } from "@/components/pages/Store/hooks/usePermissions";
import { RequirePermission } from "@/hooks/usePermission";
import { buildPermissionSet } from "@/lib/modules";
import { useConfigurations } from "@/providers/configurations/configurationsProvider";

import { CreateRoleModal } from "./CreateRoleModal";
import { EditRoleModal } from "./EditRoleModal";
import { RolesTable } from "./RolesTable";
import { permissionCatalog } from "./utils/permissionCatalog";
import { resolveRoleName } from "./utils/roleTemplates";

export function Roles({ roles, createRole, deleteRole, loading: loadingRoles, updateRoleWithPermissions, getRolePermissions }) {
  const { permissions, loading: loadingPerms } = usePermissions();
  const t = useTranslations();
  const { businessType } = useConfigurations();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    password: "",
    isAdmin: false,
    permissions: [],
  });

  const permSet = useMemo(() => buildPermissionSet(permissions), [permissions]);
  const filteredCatalog = useMemo(() => permissionCatalog.filter((perm) => {
    if (!permSet.has(perm.key)) return false;
    if (!businessType) return true;
    return perm.business === "both" || perm.business === businessType;
  }), [permSet, businessType]);

  const togglePermission = (name) => {
    setForm((prev) => {
      const exists = prev.permissions.includes(name);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== name)
          : [...prev.permissions, name],
      };
    });
  };

  const handleCreateRole = async () => {
    if (!form.name.trim()) return;
    try {
      setCreating(true);
      await createRole({
        name: form.name.trim(),
        password: form.password.trim() || undefined,
        isAdmin: form.isAdmin,
        permissions: form.permissions,
      });
      setForm({ name: "", password: "", isAdmin: false, permissions: [] });
      setShowModal(false);
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = async (role) => {
    try {
      setEditingRole(role);
      setUpdating(false);
      const rolePerms = await getRolePermissions(role.id);
      setForm({
        name: role.role,
        password: "",
        isAdmin: role.isAdmin,
        permissions: rolePerms.map((p) => p.name),
      });
      setShowEditModal(true);
    } catch {
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    try {
      setUpdating(true);
      await updateRoleWithPermissions(editingRole.id, {
        name: form.name.trim(),
        password: form.password.trim() || undefined,
        isAdmin: form.isAdmin,
        permissions: form.permissions,
      });
      setShowEditModal(false);
      setEditingRole(null);
      setForm({ name: "", password: "", isAdmin: false, permissions: [] });
      addToast({ title: t("roles.actions.saveSuccess"), color: "success" });
    } catch (error) {
      addToast({
        title: error?.status === 409 ? t("roles.actions.lastAdminErrorTittle") : t("roles.actions.saveErrorTitle"),
        description: error?.status == 409 ? t("roles.actions.lastAdminErrorDescription") : t("roles.actions.saveErrorDescription"),
        color: error?.status === 409 ? "warning" : "danger",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      setDeleting(true);
      await deleteRole(roleToDelete.id);
      setRoleToDelete(null);
      addToast({ title: t("roles.actions.deleteSuccess"), color: "success" });
    } catch (error) {
      addToast({
        title: error?.status === 409 ? t("roles.actions.lastAdminErrorTittle") : t("roles.actions.saveErrorTitle"),
        description: error?.status == 409 ? t("roles.actions.lastAdminErrorDescription") : t("roles.actions.saveErrorDescription"),
        color: error?.status === 409 ? "warning" : "danger",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-4xl font-semibold text-green-900">
            {t("roles.header.title")}
          </h2>
          <p className="text-gray-800 mt-2">
            {t("roles.header.subtitle")}
          </p>
        </div>
        <RequirePermission allOf={["roles_create"]}>
          <Button
            color="primary"
            className="bg-green-800"
            onPress={() => setShowModal(true)}
            isDisabled={loadingPerms}
          >
            {t("roles.actions.new")}
          </Button>
        </RequirePermission>
      </header>

      <Card className="bg-white rounded-lg shadow-lg overflow-x-auto">
        <CardBody className="p-4 lg:p-8">
          <RolesTable
            roles={roles}
            loading={loadingRoles}
            onEdit={openEditModal}
            onDelete={setRoleToDelete}
          />
        </CardBody>
      </Card>

      <CreateRoleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateRole}
        creating={creating}
        form={form}
        setForm={setForm}
        permissionOptions={filteredCatalog}
        togglePermission={togglePermission}
        t={t}
        businessType={businessType}
      />

      <Modal
        isOpen={!!roleToDelete}
        onOpenChange={(open) => { if (!open) setRoleToDelete(null); }}
        backdrop="blur"
        classNames={{ backdrop: "backdrop-blur-xs bg-white/10" }}
      >
        <ModalContent>
          <ModalHeader>{t("roles.actions.deleteConfirmTitle")}</ModalHeader>
          <ModalBody>
            <p>{t("roles.actions.deleteConfirmBody", { name: resolveRoleName(roleToDelete?.role ?? "", t) })}</p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="bordered"
              className="px-6 py-2 border border-border text-foreground hover:bg-muted transition-colors"
              onPress={() => setRoleToDelete(null)}
              isDisabled={deleting}
            >
              {t("roles.actions.cancel")}
            </Button>
            <Button
              color="danger"
              onPress={handleDeleteRole}
              isLoading={deleting}
            >
              {t("roles.actions.delete")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {editingRole && (
        <EditRoleModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingRole(null);
          }}
          onSubmit={handleUpdateRole}
          form={form}
          setForm={setForm}
          permissionOptions={filteredCatalog}
          togglePermission={togglePermission}
          updating={updating}
          roleName={editingRole?.role}
          t={t}
          businessType={businessType}
        />
      )}
    </div>
  );
}
