import { resolveRoleName, templateKeys, roleTemplates } from "../utils/roleTemplates";

const t = (key) => `[${key}]`;

describe("templateKeys", () => {
  it("contains all known template keys", () => {
    expect(templateKeys.has("cashier")).toBe(true);
    expect(templateKeys.has("seller")).toBe(true);
    expect(templateKeys.has("manager")).toBe(true);
    expect(templateKeys.has("admin")).toBe(true);
    expect(templateKeys.has("waiter")).toBe(true);
    expect(templateKeys.has("supervisor")).toBe(true);
  });

  it("does not contain unknown keys", () => {
    expect(templateKeys.has("custom")).toBe(false);
    expect(templateKeys.has("")).toBe(false);
  });
});

describe("resolveRoleName", () => {
  it("translates known template keys", () => {
    expect(resolveRoleName("cashier", t)).toBe("[roles.templates.cashier.name]");
    expect(resolveRoleName("admin", t)).toBe("[roles.templates.admin.name]");
    expect(resolveRoleName("waiter", t)).toBe("[roles.templates.waiter.name]");
    expect(resolveRoleName("supervisor", t)).toBe("[roles.templates.supervisor.name]");
  });

  it("returns the name as-is for non-template roles", () => {
    expect(resolveRoleName("My Custom Role", t)).toBe("My Custom Role");
    expect(resolveRoleName("Cajero Especial", t)).toBe("Cajero Especial");
  });

  it("returns empty string for empty name", () => {
    expect(resolveRoleName("", t)).toBe("");
  });

  it("returns undefined/null as-is when name is falsy", () => {
    expect(resolveRoleName(null, t)).toBe(null);
    expect(resolveRoleName(undefined, t)).toBe(undefined);
  });
});

describe("roleTemplates", () => {
  it("has store and restaurant keys", () => {
    expect(Array.isArray(roleTemplates.store)).toBe(true);
    expect(Array.isArray(roleTemplates.restaurant)).toBe(true);
  });

  it("store templates all have key, permissions, and icon", () => {
    for (const template of roleTemplates.store) {
      expect(typeof template.key).toBe("string");
      expect(Array.isArray(template.permissions)).toBe(true);
      expect(template.icon).toBeDefined();
    }
  });

  it("restaurant templates all have key, permissions, and icon", () => {
    for (const template of roleTemplates.restaurant) {
      expect(typeof template.key).toBe("string");
      expect(Array.isArray(template.permissions)).toBe(true);
      expect(template.icon).toBeDefined();
    }
  });

  it("store cashier includes shifts permissions", () => {
    const cashier = roleTemplates.store.find((t) => t.key === "cashier");
    expect(cashier.permissions).toContain("shifts_read");
    expect(cashier.permissions).toContain("shifts_create");
    expect(cashier.permissions).toContain("shifts_update");
  });

  it("admin templates have isAdmin true and empty permissions", () => {
    const storeAdmin = roleTemplates.store.find((t) => t.key === "admin");
    const restaurantAdmin = roleTemplates.restaurant.find((t) => t.key === "admin");
    expect(storeAdmin.isAdmin).toBe(true);
    expect(storeAdmin.permissions).toHaveLength(0);
    expect(restaurantAdmin.isAdmin).toBe(true);
    expect(restaurantAdmin.permissions).toHaveLength(0);
  });
});
