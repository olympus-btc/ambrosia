"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

const PERMISSION_LABEL_KEYS = {
  products_read: "permissionBlocked.products",
  categories_read: "permissionBlocked.categories",
  payments_read: "permissionBlocked.payments",
};

export function PermissionBlockedState({ missingPermissions = [] }) {
  const cartTranslations = useTranslations("cart");

  return (
    <div className="text-center py-12">
      <ShieldAlert aria-hidden="true" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-deep mb-2">{cartTranslations("permissionBlocked.title")}</h3>
      <p className="text-gray-500 mb-4">{cartTranslations("permissionBlocked.subtitle")}</p>
      <ul className="text-gray-500 list-disc list-inside space-y-1">
        {missingPermissions.map((permissionKey) => (
          <li key={permissionKey}>{cartTranslations(PERMISSION_LABEL_KEYS[permissionKey])}</li>
        ))}
      </ul>
    </div>
  );
}
