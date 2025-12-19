"use client";

import { useMemo, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Divider } from "@heroui/react";
import { Pencil, ShieldPlus } from "lucide-react";
import { StoreLayout } from "../StoreLayout";
import { useRoles } from "../hooks/useRoles";
import { usePermissions } from "../hooks/usePermissions";
import { CreateRoleModal } from "./CreateRoleModal";
import { EditRoleModal } from "./EditRoleModal";
import { permissionCatalog } from "./permissionCatalog";
import { useTranslations } from "next-intl";
import { useConfigurations } from "../../../../providers/configurations/configurationsProvider";

export function Roles() {
  const {
    roles,
    createRole,
    loading: loadingRoles,
    updateRoleWithPermissions,
    getRolePermissions,
  } = useRoles();
  const { permissions, loading: loadingPerms } = usePermissions();
  const t = useTranslations();
  const { businessType } = useConfigurations();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    password: "",
    isAdmin: false,
    permissions: [],
  });

  const permSet = useMemo(() => new Set((permissions || []).map((p) => p.name)), [permissions]);
  const filteredCatalog = useMemo(() => {
    return permissionCatalog.filter((perm) => {
      if (!permSet.has(perm.key)) return false;
      if (!businessType) return true;
      return perm.business === "both" || perm.business === businessType;
    });
  }, [permSet, businessType]);

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
      // handled by hook log
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
    } finally {
      setUpdating(false);
    }
  };

  return (
    <StoreLayout>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-semibold text-green-900">
            {t("roles.header.title")}
          </h1>
          <p className="text-gray-800 mt-2">
            {t("roles.header.subtitle")}
          </p>
        </div>
        <Button
          color="primary"
          className="bg-green-800"
          startContent={<ShieldPlus className="w-5 h-5" />}
          onPress={() => setShowModal(true)}
          isDisabled={loadingPerms}
        >
          {t("roles.actions.new")}
        </Button>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                {t("roles.list.title")}
              </h3>
              <p className="text-sm text-default-500">
                {t("roles.list.subtitle")}
              </p>
            </div>
          </CardHeader>
          <Divider />
          <CardBody>
            {loadingRoles ? (
              <p className="text-default-500">{t("roles.state.loading")}</p>
            ) : roles.length === 0 ? (
              <p className="text-default-500">{t("roles.state.empty")}</p>
            ) : (
              <div className="space-y-3">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between rounded-lg border border-default-200 px-4 py-3 bg-white"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{role.role}</p>
                      <p className="text-sm text-default-500">
                        {role.isAdmin ? t("roles.labels.admin") : t("roles.labels.standard")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {role.isAdmin ? (
                        <Chip color="success" variant="flat">
                          {t("roles.labels.adminChip")}
                        </Chip>
                      ) : (
                        <Chip color="default" variant="flat">
                          {t("roles.labels.standardChip")}
                        </Chip>
                      )}
                      <Button
                        variant="light"
                        size="sm"
                        startContent={<Pencil className="w-4 h-4" />}
                        onPress={() => openEditModal(role)}
                      >
                        {t("roles.actions.edit")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                {t("roles.permissions.title")}
              </h3>
              <p className="text-sm text-default-500">
                {t("roles.permissions.subtitle")}
              </p>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-3">
            {loadingPerms ? (
              <p className="text-default-500">{t("roles.state.loadingPerms")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredCatalog.map((perm) => (
                  <Chip key={perm.key} variant="flat" color="primary">
                    {t(`roles.permissions.items.${perm.key}.label`, {
                      defaultValue: perm.key,
                    })}
                  </Chip>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

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
    </StoreLayout>
  );
}
