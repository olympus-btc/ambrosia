import rolesEn from "../locales/en";
import rolesEs from "../locales/es";
import { getVisiblePermissionCatalog, permissionCatalog } from "../utils/permissionCatalog";

describe("permissionCatalog", () => {
  it("hides admin-only permissions from limited roles", () => {
    const visibleKeys = getVisiblePermissionCatalog({
      availablePermissions: [
        { name: "roles_read", adminOnly: false },
        { name: "roles_create", adminOnly: true },
        { name: "roles_update", adminOnly: true },
        { name: "roles_delete", adminOnly: true },
        { name: "permissions_read", adminOnly: true },
      ],
      businessType: "store",
      isAdmin: false,
    }).map((permission) => permission.key);

    expect(visibleKeys).toEqual(["roles_read"]);
  });

  it("shows admin-only permissions when admin is enabled", () => {
    const visibleKeys = getVisiblePermissionCatalog({
      availablePermissions: [
        { name: "roles_read", adminOnly: false },
        { name: "roles_create", adminOnly: true },
        { name: "roles_update", adminOnly: true },
        { name: "roles_delete", adminOnly: true },
        { name: "permissions_read", adminOnly: true },
      ],
      businessType: "store",
      isAdmin: true,
    }).map((permission) => permission.key);

    expect(visibleKeys).toEqual(["roles_read", "roles_create", "roles_update", "roles_delete", "permissions_read"]);
  });

  it.each([
    ["en", rolesEn],
    ["es", rolesEs],
  ])("has a translated label and description for every catalog permission in %s", (_localeName, localeMessages) => {
    const translatedPermissions = localeMessages.roles.permissions.items;

    const untranslatedPermissionKeys = permissionCatalog
      .map((permission) => permission.key)
      .filter((permissionKey) => {
        const translatedPermission = translatedPermissions[permissionKey];
        return typeof translatedPermission?.label !== "string" || typeof translatedPermission?.description !== "string";
      });

    expect(untranslatedPermissionKeys).toEqual([]);
  });
});
