export function buildPermissionSet(permissions = []) {
  return new Set((permissions || []).map((permission) => permission.name));
}

export const features = {
  auth: {
    enabled: true,
    name: "Autenticación",
    routes: [
      { path: "/auth", requiresAuth: false },
      { path: "/restaurant/roles", requiresAuth: true, requiresAdmin: false, permissions: ["roles_read"] },
      { path: "/restaurant/users", requiresAuth: true, requiresAdmin: false, permissions: ["users_read"] },
    ],
    navItems: [
      { path: "/restaurant/roles", label: "Roles", icon: "user-lock", showInNavbar: true },
      { path: "/restaurant/users", label: "Usuarios", icon: "users", showInNavbar: true },
    ],
  },
  store: {
    enabled: true,
    name: "Store",
    routes: [
      { path: "/store", requiresAuth: true, requiresAdmin: false, types: ["store"], default: true },
      { path: "/store/users", requiresAuth: true, requiresAdmin: false, types: ["store"], permissions: ["users_read"] },
      { path: "/store/products", requiresAuth: true, requiresAdmin: false, types: ["store"], permissions: ["products_read"] },
      { path: "/store/cart", requiresAuth: true, requiresAdmin: false, types: ["store"], permissions: ["orders_create"] },
      { path: "/store/orders", requiresAuth: true, requiresAdmin: false, types: ["store"], permissions: ["orders_read"] },
      { path: "/store/wallet", requiresAuth: true, requiresAdmin: false, types: ["store"], permissions: ["wallet_read"] },
      { path: "/store/reports", requiresAuth: true, requiresAdmin: true, types: ["store"], permissions: ["wallet_read"] },
      { path: "/store/settings", requiresAuth: true, requiresAdmin: false, types: ["store"], permissions: ["settings_update"] },
    ],
    navItems: [
      { path: "/store/users", label: "users", icon: "users", showInNavbar: true },
      { path: "/store/products", label: "products", icon: "box", showInNavbar: true, showInBottomNav: true, bottomNavOrder: 2 },
      { path: "/store/cart", label: "cart", icon: "shopping-cart", showInNavbar: true, showInBottomNav: true, bottomNavOrder: 1 },
      { path: "/store/orders", label: "orders", icon: "clipboard-clock", showInNavbar: true, showInBottomNav: true, bottomNavOrder: 3 },
      { path: "/store/wallet", label: "wallet", icon: "wallet", showInNavbar: true, tourId: "nav-wallet" },
      { path: "/store/reports", label: "reports", icon: "chart-line", showInNavbar: true },
      { path: "/store/settings", label: "settings", icon: "settings", showInNavbar: true, tourId: "nav-settings" },
    ],
  },
};

export function matchesBusiness(target, businessType) {
  if (!businessType) return true;
  if (target && typeof target === "object") {
    const types = Array.isArray(target.types) ? target.types : null;
    if (types && types.length > 0) return types.includes(businessType);
    const path = target.path;
    if (typeof path === "string") {
      if (path.startsWith("/restaurant/")) return businessType === "restaurant";
      if (path.startsWith("/store/")) return businessType === "store";
    }
    return true;
  }
  if (typeof target === "string") {
    const path = target;
    if (path.startsWith("/restaurant/")) return businessType === "restaurant";
    if (path.startsWith("/store/")) return businessType === "store";
  }
  return true;
}

export function getAvailableFeatures(
  isAuthenticated = false,
  isAdmin = false,
  permissions = [],
  businessType = null,
) {
  const permNames = buildPermissionSet(permissions);
  const available = {};

  Object.entries(features).forEach(([featureKey, featureConfig]) => {
    if (!featureConfig.enabled) return;

    const availableRoutes = featureConfig.routes.filter((route) => {
      if (!matchesBusiness(route, businessType)) return false;
      if (!route.requiresAuth) return true;
      if (route.requiresAuth && !isAuthenticated) return false;
      if (route.requiresAdmin && !isAdmin) return false;
      if (route.permissions && route.permissions.length > 0) {
        return route.permissions.every((k) => permNames.has(k));
      }
      return true;
    });

    const availableNavItems = (featureConfig.navItems || []).filter((navItem) => {
      if (!isAuthenticated) return false;
      if (navItem.showInNavbar === false) return false;
      const route = (featureConfig.routes || []).find((r) => r.path === navItem.path) || {};
      if (!matchesBusiness(navItem, businessType)) return false;
      if (!matchesBusiness(route, businessType)) return false;
      const requiresAdmin = navItem.requiresAdmin || route.requiresAdmin || false;
      if (requiresAdmin && !isAdmin) return false;
      const requiredPerms = navItem.permissions || route.permissions;
      if (requiredPerms && requiredPerms.length > 0) {
        return requiredPerms.every((k) => permNames.has(k));
      }
      return true;
    });

    if (availableRoutes.length > 0 || availableNavItems.length > 0) {
      available[featureKey] = {
        ...featureConfig,
        routes: availableRoutes,
        navItems: availableNavItems,
      };
    }
  });

  return available;
}

export function getAvailableNavigation(
  isAuthenticated = false,
  isAdmin = false,
  permissions = [],
  businessType = null,
) {
  const available = getAvailableFeatures(isAuthenticated, isAdmin, permissions, businessType);
  const navItems = [];

  Object.entries(available).forEach(([featureKey, config]) => {
    config.navItems?.forEach((item) => {
      navItems.push({ ...item, feature: featureKey });
    });
  });

  return navItems;
}
