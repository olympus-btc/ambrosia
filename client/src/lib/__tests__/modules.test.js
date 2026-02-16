import {
  modules,
  getActiveModules,
  getModuleRoutes,
  findRouteConfig,
  matchesBusiness,
  getNavigationItems,
  getAvailableModules,
  hasAccessToRoute,
} from "../modules";

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ============================
// getActiveModules
// ============================
describe("getActiveModules", () => {
  it("returns only enabled modules", () => {
    const active = getActiveModules();

    const keys = active.map((m) => m.key);
    expect(keys).toContain("auth");
    expect(keys).toContain("dishes");
    expect(keys).toContain("store");
    expect(keys).not.toContain("color-test");
  });

  it("each module has key and name", () => {
    const active = getActiveModules();

    active.forEach((m) => {
      expect(m.key).toBeDefined();
      expect(m.name).toBeDefined();
      expect(m.enabled).toBe(true);
    });
  });

  it("disabled modules are excluded", () => {
    const active = getActiveModules();
    const disabledModule = active.find((m) => m.key === "color-test");
    expect(disabledModule).toBeUndefined();
  });
});

// ============================
// getModuleRoutes
// ============================
describe("getModuleRoutes", () => {
  it("returns flattened routes from all enabled modules", () => {
    const routes = getModuleRoutes();

    expect(routes.length).toBeGreaterThan(0);
    routes.forEach((r) => {
      expect(r.path).toBeDefined();
      expect(r.module).toBeDefined();
      expect(r.fullPath).toBe(r.path);
    });
  });

  it("does not include routes from disabled modules", () => {
    const routes = getModuleRoutes();
    const colorTestRoutes = routes.filter((r) => r.module === "color-test");
    expect(colorTestRoutes).toHaveLength(0);
  });

  it("includes routes from auth module", () => {
    const routes = getModuleRoutes();
    const authRoutes = routes.filter((r) => r.module === "auth");
    expect(authRoutes.length).toBeGreaterThan(0);
    expect(authRoutes.find((r) => r.path === "/auth")).toBeTruthy();
  });

  it("includes routes from store module", () => {
    const routes = getModuleRoutes();
    const storeRoutes = routes.filter((r) => r.module === "store");
    expect(storeRoutes.length).toBeGreaterThan(0);
  });
});

// ============================
// findRouteConfig
// ============================
describe("findRouteConfig", () => {
  it("finds exact path match", () => {
    const config = findRouteConfig("/auth");

    expect(config).not.toBeNull();
    expect(config.module).toBe("auth");
    expect(config.route.path).toBe("/auth");
  });

  it("finds parameterized path match", () => {
    const config = findRouteConfig("/restaurant/modify-order/123");

    expect(config).not.toBeNull();
    expect(config.module).toBe("orders");
    expect(config.route.path).toBe("/restaurant/modify-order/:pedidoId");
  });

  it("finds another parameterized path", () => {
    const config = findRouteConfig("/restaurant/tables/room-42");

    expect(config).not.toBeNull();
    expect(config.module).toBe("spaces");
    expect(config.route.path).toBe("/restaurant/tables/:roomId");
  });

  it("returns null for unknown path", () => {
    const config = findRouteConfig("/nonexistent/page");

    expect(config).toBeNull();
  });

  it("returns null for disabled module routes", () => {
    const config = findRouteConfig("/color-test");

    expect(config).toBeNull();
  });

  it("returns moduleConfig in result", () => {
    const config = findRouteConfig("/store");

    expect(config.moduleConfig).toBeDefined();
    expect(config.moduleConfig.name).toBe("Store");
  });
});

// ============================
// matchesBusiness
// ============================
describe("matchesBusiness", () => {
  it("returns true when no businessType is specified", () => {
    expect(matchesBusiness({ path: "/store" }, null)).toBe(true);
    expect(matchesBusiness({ path: "/store" }, undefined)).toBe(true);
  });

  it("matches by types array on target object", () => {
    expect(matchesBusiness({ types: ["store"] }, "store")).toBe(true);
    expect(matchesBusiness({ types: ["store"] }, "restaurant")).toBe(false);
  });

  it("matches by path prefix when no types array", () => {
    expect(matchesBusiness({ path: "/restaurant/dishes" }, "restaurant")).toBe(true);
    expect(matchesBusiness({ path: "/restaurant/dishes" }, "store")).toBe(false);
    expect(matchesBusiness({ path: "/store/products" }, "store")).toBe(true);
    expect(matchesBusiness({ path: "/store/products" }, "restaurant")).toBe(false);
  });

  it("returns true for paths not matching any prefix", () => {
    expect(matchesBusiness({ path: "/auth" }, "store")).toBe(true);
    expect(matchesBusiness({ path: "/wallet" }, "restaurant")).toBe(true);
  });

  it("handles string target (path directly)", () => {
    expect(matchesBusiness("/restaurant/dishes", "restaurant")).toBe(true);
    expect(matchesBusiness("/store/cart", "store")).toBe(true);
    expect(matchesBusiness("/store/cart", "restaurant")).toBe(false);
  });

  it("returns true for non-string/non-object target", () => {
    expect(matchesBusiness(null, "store")).toBe(true);
    expect(matchesBusiness(42, "store")).toBe(true);
  });
});

// ============================
// getNavigationItems
// ============================
describe("getNavigationItems", () => {
  it("returns navbar items for admin user", () => {
    const items = getNavigationItems([], true, null);

    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      expect(item.path).toBeDefined();
      expect(item.label).toBeDefined();
      expect(item.module).toBeDefined();
    });
  });

  it("excludes items with showInNavbar=false", () => {
    const items = getNavigationItems([], true, null);

    const hiddenPaths = ["/open-turn", "/close-turn", "/reports"];
    hiddenPaths.forEach((path) => {
      expect(items.find((i) => i.path === path)).toBeUndefined();
    });
  });

  it("excludes admin-only items for non-admin user", () => {
    const items = getNavigationItems([], false, null);

    // /restaurant/roles requires admin
    expect(items.find((i) => i.path === "/restaurant/roles")).toBeUndefined();
  });

  it("includes permission-gated items when user has permission", () => {
    const perms = [{ name: "users_read" }];
    const items = getNavigationItems(perms, false, null);

    expect(items.find((i) => i.path === "/restaurant/users")).toBeTruthy();
  });

  it("excludes permission-gated items when user lacks permission", () => {
    const items = getNavigationItems([], false, null);

    // /restaurant/users requires users_read
    expect(items.find((i) => i.path === "/restaurant/users")).toBeUndefined();
  });

  it("filters by businessType", () => {
    const items = getNavigationItems([], true, "store");

    // Store items should be present
    expect(items.find((i) => i.path === "/store/products")).toBeTruthy();
    // Restaurant items should be excluded
    expect(items.find((i) => i.path === "/restaurant/dishes")).toBeUndefined();
  });
});

// ============================
// getAvailableModules
// ============================
describe("getAvailableModules", () => {
  it("returns modules with available routes for authenticated admin", () => {
    const available = getAvailableModules(true, true, [], null);

    expect(Object.keys(available).length).toBeGreaterThan(0);
    expect(available.auth).toBeDefined();
    expect(available.dishes).toBeDefined();
  });

  it("excludes disabled modules", () => {
    const available = getAvailableModules(true, true, [], null);

    expect(available["color-test"]).toBeUndefined();
  });

  it("excludes admin routes for non-admin", () => {
    const available = getAvailableModules(true, false, [], null);

    // dishes module only has admin route
    expect(available.dishes).toBeUndefined();
  });

  it("excludes auth-required routes for unauthenticated user", () => {
    const available = getAvailableModules(false, false, [], null);

    // Only /auth (requiresAuth: false) should remain
    const authModule = available.auth;
    expect(authModule).toBeDefined();
    expect(authModule.routes.every((r) => !r.requiresAuth)).toBe(true);
  });

  it("filters by permissions", () => {
    const perms = [{ name: "users_read" }];
    const available = getAvailableModules(true, false, perms, null);

    // auth module should include /restaurant/users (requires users_read)
    const authRoutes = available.auth?.routes || [];
    const usersRoute = authRoutes.find((r) => r.path === "/restaurant/users");
    expect(usersRoute).toBeTruthy();
  });

  it("filters by businessType", () => {
    const available = getAvailableModules(true, true, [], "store");

    // Store routes should be present
    expect(available.store).toBeDefined();
    const storePaths = available.store.routes.map((r) => r.path);
    expect(storePaths).toContain("/store");
  });
});

// ============================
// hasAccessToRoute
// ============================
describe("hasAccessToRoute", () => {
  it("grants access to public route (/auth)", () => {
    expect(hasAccessToRoute("/auth", false, false, [])).toBe(true);
  });

  it("denies access to auth-required route when not authenticated", () => {
    expect(hasAccessToRoute("/store", false, false, [])).toBe(false);
  });

  it("grants access to auth-required route when authenticated", () => {
    expect(hasAccessToRoute("/store", true, false, [], "store")).toBe(true);
  });

  it("denies access to admin route when not admin", () => {
    expect(hasAccessToRoute("/restaurant/dishes", true, false, [])).toBe(false);
  });

  it("grants access to admin route when admin", () => {
    expect(hasAccessToRoute("/restaurant/dishes", true, true, [])).toBe(true);
  });

  it("denies access to permission-gated route without permission", () => {
    expect(hasAccessToRoute("/restaurant/users", true, false, [])).toBe(false);
  });

  it("grants access to permission-gated route with permission", () => {
    const perms = [{ name: "users_read" }];
    expect(hasAccessToRoute("/restaurant/users", true, false, perms)).toBe(true);
  });

  it("returns false for unknown route", () => {
    expect(hasAccessToRoute("/nonexistent", true, true, [])).toBe(false);
  });

  it("respects businessType filtering", () => {
    expect(hasAccessToRoute("/store", true, false, [], "store")).toBe(true);
    expect(hasAccessToRoute("/store", true, false, [], "restaurant")).toBe(false);
  });
});
