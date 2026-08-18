"use client";
import { useMemo } from "react";

import { Checkbox, Chip, Divider } from "@heroui/react";
import { useTranslations } from "next-intl";

export function PermissionSelector({
  catalog = [],
  selected = [],
  togglePermission,
  businessType,
  isAdmin = false,
}) {
  const roleTranslations = useTranslations();
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const groupedPermissions = useMemo(() => catalog.reduce((permissionsByGroup, permission) => {
    const groupKey = permission.group || "other";
    if (!permissionsByGroup[groupKey]) permissionsByGroup[groupKey] = [];
    permissionsByGroup[groupKey].push(permission);
    return permissionsByGroup;
  }, {}), [catalog]);

  return (
    <div className="space-y-4">
      {(businessType || isAdmin) && (
        <div className="space-y-2">
          <p className={`text-xs text-primary-600 ${isAdmin ? "" : "invisible"}`}>
            {roleTranslations("roles.permissions.adminNotice")}
          </p>
          {businessType && (
            <div className="flex justify-end">
              <Chip size="sm" variant="flat">
                {businessType === "store"
                  ? roleTranslations("roles.permissions.scope.store")
                  : roleTranslations("roles.permissions.scope.restaurant")}
              </Chip>
            </div>
          )}
        </div>
      )}
      {Object.entries(groupedPermissions).map(([groupKey, permissions]) => (
        <div key={groupKey} className="border border-primary-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-default-700">
              {roleTranslations(`roles.permissions.groups.${groupKey}`, { defaultValue: groupKey })}
            </p>
          </div>
          <Divider className="mb-3 bg-primary-200" />
          <div className="grid md:grid-cols-2 gap-2">
            {permissions.map((permission) => (
              <div key={permission.key} className="flex flex-col gap-1">
                <Checkbox
                  isSelected={isAdmin || selectedSet.has(permission.key)}
                  isDisabled={isAdmin}
                  onValueChange={() => togglePermission(permission.key)}
                >
                  {roleTranslations(`roles.permissions.items.${permission.key}.label`, { defaultValue: permission.key })}
                </Checkbox>
                <p className="text-xs text-default-500">
                  {roleTranslations(`roles.permissions.items.${permission.key}.description`, {
                    defaultValue: permission.key,
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
