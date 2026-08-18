import { getVisiblePermissionCatalog } from "../utils/permissionCatalog";

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
});
