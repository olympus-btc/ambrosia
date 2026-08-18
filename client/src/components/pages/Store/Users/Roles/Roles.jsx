"use client";

import { useMemo, useRef, useState } from "react";

import { addToast, Button, Card, CardBody } from "@heroui/react";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { usePermissions } from "@/components/pages/Store/hooks/usePermissions";
import { PageHeader } from "@/components/shared/PageHeader";
import { useNavigation } from "@/hooks/useNavigation";
import { RequirePermission } from "@/hooks/usePermission";
import { useConfigurations } from "@/providers/configurations/configurationsProvider";

import { CreateRoleModal } from "./CreateRoleModal";
import { DeleteRoleModal } from "./DeleteRoleModal";
import { EditRoleModal } from "./EditRoleModal";
import { RolesList } from "./RolesList";
import { getVisiblePermissionCatalog, permissionCatalog } from "./utils/permissionCatalog";

export function Roles({ roles, createRole, deleteRole, loading: loadingRoles, updateRoleWithPermissions, getRolePermissions }) {
  const roleTranslations = useTranslations();
  const { businessType } = useConfigurations();
  const { isAdmin } = useNavigation();
  const { permissions, loading: loadingPerms } = usePermissions({ enabled: isAdmin });
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const creatingRef = useRef(false);
  const updatingRef = useRef(false);
  const deletingRef = useRef(false);
  const [form, setForm] = useState({
    name: "",
    isAdmin: false,
    permissions: [],
  });

  const filteredCatalog = useMemo(() => getVisiblePermissionCatalog({
    availablePermissions: permissions,
    businessType,
    isAdmin: form.isAdmin,
  }), [permissions, businessType, form.isAdmin]);

  const togglePermission = (name) => {
    setForm((previousForm) => {
      const permissionExists = previousForm.permissions.includes(name);
      if (permissionExists) {
        return {
          ...previousForm,
          permissions: previousForm.permissions.filter((permissionName) => permissionName !== name),
        };
      }
      const suggestedPermissions = permissionCatalog.find((permission) => permission.key === name)?.suggests ?? [];
      const permissionsToAdd = [name, ...suggestedPermissions].filter(
        (permissionName) => !previousForm.permissions.includes(permissionName),
      );
      return {
        ...previousForm,
        permissions: [...previousForm.permissions, ...permissionsToAdd],
      };
    });
  };

  const handleCreateRole = async () => {
    if (!form.name.trim()) return;
    if (creatingRef.current) return;
    creatingRef.current = true;
    try {
      setCreating(true);
      await createRole({
        name: form.name.trim(),
        isAdmin: form.isAdmin,
        permissions: form.permissions,
      });
      setForm({ name: "", isAdmin: false, permissions: [] });
      setShowModal(false);
      addToast({ title: roleTranslations("roles.actions.createSuccess"), color: "success" });
    } catch (error) {
      const adminRequired = error?.status === 403 && form.isAdmin;
      addToast({
        title: adminRequired
          ? roleTranslations("roles.actions.adminRequiredTitle")
          : error?.status === 409 ? roleTranslations("roles.actions.createConflictTitle") : roleTranslations("roles.actions.createErrorTitle"),
        description: adminRequired
          ? roleTranslations("roles.actions.adminRequiredDescription")
          : error?.status === 409 ? roleTranslations("roles.actions.createConflictDescription") : roleTranslations("roles.actions.createErrorDescription"),
        color: adminRequired || error?.status === 409 ? "warning" : "danger",
      });
    } finally {
      creatingRef.current = false;
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
        isAdmin: role.isAdmin,
        permissions: rolePerms.map((permission) => permission.name),
      });
      setShowEditModal(true);
    } catch {
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    if (updatingRef.current) return;
    updatingRef.current = true;
    try {
      setUpdating(true);
      await updateRoleWithPermissions(editingRole.id, {
        name: form.name.trim(),
        isAdmin: form.isAdmin,
        permissions: form.permissions,
      });
      setShowEditModal(false);
      setEditingRole(null);
      setForm({ name: "", isAdmin: false, permissions: [] });
      addToast({ title: roleTranslations("roles.actions.saveSuccess"), color: "success" });
    } catch (error) {
      const adminRequired = error?.status === 403 && form.isAdmin;
      addToast({
        title: adminRequired
          ? roleTranslations("roles.actions.adminRequiredTitle")
          : error?.status === 409 ? roleTranslations("roles.actions.lastAdminErrorTitle") : roleTranslations("roles.actions.saveErrorTitle"),
        description: adminRequired
          ? roleTranslations("roles.actions.adminRequiredDescription")
          : error?.status === 409 ? roleTranslations("roles.actions.lastAdminErrorDescription") : roleTranslations("roles.actions.saveErrorDescription"),
        color: adminRequired || error?.status === 409 ? "warning" : "danger",
      });
    } finally {
      updatingRef.current = false;
      setUpdating(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    if (deletingRef.current) return;
    deletingRef.current = true;
    try {
      setDeleting(true);
      await deleteRole(roleToDelete.id);
      setRoleToDelete(null);
      addToast({ title: roleTranslations("roles.actions.deleteSuccess"), color: "success" });
    } catch (error) {
      addToast({
        title: error?.status === 409 ? roleTranslations("roles.actions.lastAdminErrorTitle") : roleTranslations("roles.actions.saveErrorTitle"),
        description: error?.status === 409 ? roleTranslations("roles.actions.lastAdminErrorDescription") : roleTranslations("roles.actions.deleteError"),
        color: error?.status === 409 ? "warning" : "danger",
      });
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={roleTranslations("roles.header.title")}
        subtitle={roleTranslations("roles.header.subtitle")}
        actions={(
          isAdmin ? (
            <RequirePermission allOf={["roles_create"]}>
              <Button
                color="primary"
                className="bg-green-800"
                onPress={() => setShowModal(true)}
                isDisabled={loadingPerms}
              >
                {roleTranslations("roles.actions.new")}
              </Button>
            </RequirePermission>
          ) : null
        )}
      />

      {!isAdmin && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
          <div>
            <p className="text-sm font-semibold text-green-900">{roleTranslations("roles.state.readOnlyTitle")}</p>
            <p className="mt-0.5 text-sm text-green-700">{roleTranslations("roles.state.readOnlyDescription")}</p>
          </div>
        </div>
      )}

      <Card className="bg-white rounded-lg shadow-lg overflow-x-auto">
        <CardBody className="p-4 lg:p-8">
          <RolesList
            roles={roles}
            loading={loadingRoles}
            canManageRoles={isAdmin}
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
        businessType={businessType}
      />

      <DeleteRoleModal
        role={roleToDelete}
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleDeleteRole}
        deleting={deleting}
      />

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
          businessType={businessType}
        />
      )}
    </div>
  );
}
