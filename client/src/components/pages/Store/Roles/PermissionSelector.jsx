"use client";
import { Checkbox, Chip, Divider } from "@heroui/react";
import { useMemo } from "react";

export function PermissionSelector({
  catalog = [],
  selected = [],
  togglePermission,
  t,
  businessType,
}) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const grouped = useMemo(() => {
    return catalog.reduce((acc, perm) => {
      const groupKey = perm.group || "other";
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(perm);
      return acc;
    }, {});
  }, [catalog]);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([groupKey, perms]) => (
        <div key={groupKey} className="border border-default-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-default-700">
              {t(`roles.permissions.groups.${groupKey}`, { defaultValue: groupKey })}
            </p>
            {businessType && (
              <Chip size="sm" variant="flat">
                {businessType === "store"
                  ? t("roles.permissions.scope.store")
                  : t("roles.permissions.scope.restaurant")}
              </Chip>
            )}
          </div>
          <Divider className="mb-3" />
          <div className="grid md:grid-cols-2 gap-2">
            {perms.map((perm) => (
              <div key={perm.key} className="flex flex-col gap-1">
                <Checkbox
                  isSelected={selectedSet.has(perm.key)}
                  onValueChange={() => togglePermission(perm.key)}
                >
                  {t(`roles.permissions.items.${perm.key}.label`, { defaultValue: perm.key })}
                </Checkbox>
                <p className="text-xs text-default-500">
                  {t(`roles.permissions.items.${perm.key}.description`, {
                    defaultValue: perm.key,
                  })}
                </p>
                {perm.related && perm.related.length > 0 && (
                  <p className="text-[11px] text-default-400">
                    {t("roles.permissions.affects")}{" "}
                    {perm.related.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
