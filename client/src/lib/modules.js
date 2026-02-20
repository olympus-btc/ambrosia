export const modules = {
  auth: {
    enabled: true,
    name: "Autenticación",
    routes: [
      { path: "/auth", component: "PinLogin", requiresAuth: false },
      {
        path: "/restaurant/roles",
        component: "Roles",
        requiresAuth: true,
        requiresAdmin: true,
      },
      {
        path: "/restaurant/users",
        component: "Users",
        requiresAuth: true,
        requiresAdmin: false,
        permissions: ["users_read"],
      },
    ],
    services: () => import("../modules/auth/authService"),
    navItems: [
      {
        path: "/restaurant/roles",
        label: "Roles",
        icon: "user-lock",
        showInNavbar: true,
      },
      {
        path: "/restaurant/users",
        label: "Usuarios",
        icon: "users",
        showInNavbar: true,
      },
    ],
  },
  dishes: {
    enabled: true,
    name: "Platillos",
    routes: [
      {
        path: "/restaurant/dishes",
        component: "Dishes",
        requiresAuth: true,
        requiresAdmin: true,
      },
    ],
    services: () => import("../modules/dishes/dishesService"),
    navItems: [
      {
        path: "/restaurant/dishes",
        label: "Platillos",
        icon: "salad",
        showInNavbar: true,
      },
    ],
  },
  cashier: {
    enabled: true,
    name: "Wallet",
    routes: [
      {
        path: "/open-turn",
        component: "OpenTurn",
        requiresAuth: true,
        requiresAdmin: false,
      },
      {
        path: "/close-turn",
        component: "CloseTurn",
        requiresAuth: true,
        requiresAdmin: false,
      },
      {
        path: "/reports",
        component: "Reports",
        requiresAuth: true,
        requiresAdmin: true,
      },
      {
        path: "/wallet",
        component: "Wallet",
        requiresAuth: true,
        requiresAdmin: true,
      },
    ],
    services: () => import("../modules/cashier/cashierService"),
    navItems: [
      {
        path: "/open-turn",
        label: "Abrir Turno",
        icon: "play-circle",
        showInNavbar: false,
      },
      {
        path: "/close-turn",
        label: "Cerrar Turno",
        icon: "pause-circle",
        showInNavbar: false,
      },
      {
        path: "/reports",
        label: "Reportes",
        icon: "chart-line",
        showInNavbar: false, // Oculto del navbar pero accesible por URL
      },
    ],
  },
  orders: {
    enabled: true,
    name: "Ordenes",
    routes: [
      {
        path: "/restaurant/all-orders",
        component: "Orders",
        requiresAuth: true,
        requiresAdmin: false,
        default: true,
      },
      {
        path: "/restaurant/modify-order/:pedidoId",
        component: "EditOrder",
        requiresAuth: true,
        requiresAdmin: false,
      },
    ],
    services: () => import("../modules/orders/ordersService"),
    navItems: [
      {
        path: "/restaurant/all-orders",
        label: "Ordenes",
        icon: "clipboard-clock",
        showInNavbar: true,
      },
    ],
  },
  spaces: {
    enabled: true,
    name: "Salas",
    routes: [
      {
        path: "/restaurant/rooms",
        component: "Rooms",
        requiresAuth: true,
        requiresAdmin: false,
      },
      {
        path: "/restaurant/tables/:roomId",
        component: "Tables",
        requiresAuth: true,
        requiresAdmin: false,
      },
      {
        path: "/restaurant/spaces",
        component: "Spaces",
        requiresAuth: true,
        requiresAdmin: true,
      },
    ],
    services: () => import("../modules/spaces/spacesService"),
    navItems: [
      {
        path: "/restaurant/rooms",
        label: "Ver Salas",
        icon: "building",
        showInNavbar: false,
      },
      {
        path: "/restaurant/spaces",
        label: "Administrar Espacios",
        icon: "door-open",
        showInNavbar: true,
      },
    ],
  },
  "color-test": {
    enabled: false,
    name: "Color Test",
    routes: [
      {
        path: "/color-test",
        component: "ColorTest",
        requiresAuth: true,
        requiresAdmin: true,
      },
    ],
    services: () => import("../modules/spaces/spacesService"),
    navItems: [
      {
        path: "/color-test",
        label: "Ver colores",
        icon: "building",
        showInNavbar: true,
      },
    ],
  },
  store: {
    enabled: true,
    name: "Store",
    componentBase: "components/pages",
    componentPath: "Store",
    routes: [
      {
        path: "/store",
        component: "Store",
        requiresAuth: true,
        requiresAdmin: false,
        types: ["store"],
        default: true,
      },
      {
        path: "/store/users",
        component: "Users",
        requiresAuth: true,
        requiresAdmin: false,
        types: ["store"],
        default: false,
      },
      {
        path: "/store/products",
        component: "Products",
        requiresAuth: true,
        requiresAdmin: false,
        types: ["store"],
        default: false,
      },
      {
        path: "/store/cart",
        component: "Cart",
        requiresAuth: true,
        requiresAdmin: false,
        types: ["store"],
        default: false,
      },
      {
        path: "/store/orders",
        component: "Orders",
        requiresAuth: true,
        requiresAdmin: false,
        types: ["store"],
        default: false,
      },
      {
        path: "/store/wallet",
        component: "Wallet",
        requiresAuth: true,
        requiresAdmin: false,
        types: ["store"],
        default: false,
      },
      {
        path: "/store/btcmap",
        component: "MapEmbed",
        requiresAuth: true,
        requiresAdmin: false,
        types: ["store"],
        default: false,
      },
      {
        path: "/store/settings",
        component: "Settings",
        requiresAuth: true,
        requiresAdmin: true,
        types: ["store"],
        default: false,
      },
    ],
    navItems: [
      {
        path: "/store/users",
        label: "users",
        icon: "users",
        showInNavbar: true,
      },
      {
        path: "/store/products",
        label: "products",
        icon: "box",
        showInNavbar: true,
      },
      {
        path: "/store/cart",
        label: "cart",
        icon: "shopping-cart",
        showInNavbar: true,
      },
      {
        path: "/store/orders",
        label: "orders",
        icon: "clipboard-clock",
        showInNavbar: true,
      },
      {
        path: "/store/wallet",
        label: "wallet",
        icon: "wallet",
        showInNavbar: true,
      },
      {
        path: "/store/btcmap",
        label: "btcmap",
        icon: "map",
        showInNavbar: true,
      },
      {
        path: "/store/settings",
        label: "settings",
        icon: "settings",
        showInNavbar: true,
      },
    ],
  },
};

export function getActiveModules() {
  return Object.entries(modules)
    .filter(([, config]) => config.enabled)
    .map(([key, config]) => ({ key, ...config }));
}

export function getModuleRoutes() {
  const routes = [];
  Object.entries(modules).forEach(([moduleKey, config]) => {
    if (config.enabled) {
      config.routes.forEach((route) => {
        routes.push({
          ...route,
          module: moduleKey,
          fullPath: route.path,
        });
      });
    }
  });
  return routes;
}

export function findRouteConfig(pathname) {
  for (const [moduleKey, moduleConfig] of Object.entries(modules)) {
    if (!moduleConfig.enabled) continue;

    const route = moduleConfig.routes.find((r) => {
      if (r.path === pathname) return true;

      const pathSegments = pathname.split("/").filter(Boolean);
      const routeSegments = r.path.split("/").filter(Boolean);

      if (pathSegments.length !== routeSegments.length) return false;

      return routeSegments.every((segment, i) => {
        if (segment.startsWith(":")) return true;
        return segment === pathSegments[i];
      });
    });

    if (route) {
      return {
        module: moduleKey,
        route,
        moduleConfig,
      };
    }
  }
  return null;
}

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

export function getNavigationItems(
  permissions = [],
  isAdmin = false,
  businessType = null,
) {
  const navItems = [];
  const permNames = new Set((permissions || []).map((p) => p.name));

  console.log(permNames);
  Object.entries(modules).forEach(([moduleKey, config]) => {
    if (!config.enabled) return;

    config.navItems?.forEach((item) => {
      if (item.showInNavbar === false) return;
      if (!matchesBusiness(item.path, businessType)) return;

      const route =
        (config.routes || []).find((r) => r.path === item.path) || {};
      const requiresAdmin = item.requiresAdmin || route.requiresAdmin || false;
      if (requiresAdmin && !isAdmin) return;

      const requiredPerms = item.permissions || route.permissions;
      const passesPerms =
        !requiredPerms || requiredPerms.every((k) => permNames.has(k));

      if (passesPerms) {
        navItems.push({
          ...item,
          module: moduleKey,
        });
      }
    });
  });

  return navItems;
}

export function getAvailableModules(
  isAuthenticated = false,
  isAdmin = false,
  permissions = [],
  businessType = null,
) {
  const permNames = new Set((permissions || []).map((p) => p.name));
  const availableModules = {};

  Object.entries(modules).forEach(([moduleKey, moduleConfig]) => {
    if (!moduleConfig.enabled) return;

    const availableRoutes = moduleConfig.routes.filter((route) => {
      if (!matchesBusiness(route, businessType)) return false;
      if (!route.requiresAuth) return true;

      if (route.requiresAuth && !isAuthenticated) return false;

      if (route.requiresAdmin && !isAdmin) return false;

      if (route.permissions && route.permissions.length > 0) {
        return route.permissions.every((k) => permNames.has(k));
      }

      return true;
    });

    const availableNavItems = (moduleConfig.navItems || []).filter(
      (navItem) => {
        if (!isAuthenticated) return false;
        if (navItem.showInNavbar === false) return false;
        const route =
          (moduleConfig.routes || []).find((r) => r.path === navItem.path) ||
          {};
        if (!matchesBusiness(navItem, businessType)) return false;
        if (!matchesBusiness(route, businessType)) return false;
        const requiresAdmin =
          navItem.requiresAdmin || route.requiresAdmin || false;
        if (requiresAdmin && !isAdmin) return false;
        const requiredPerms = navItem.permissions || route.permissions;
        if (requiredPerms && requiredPerms.length > 0) {
          return requiredPerms.every((k) => permNames.has(k));
        }
        return true;
      },
    );

    if (availableRoutes.length > 0 || availableNavItems.length > 0) {
      availableModules[moduleKey] = {
        ...moduleConfig,
        routes: availableRoutes,
        navItems: availableNavItems,
      };
    }
  });

  return availableModules;
}

export function getAvailableNavigation(
  isAuthenticated = false,
  isAdmin = false,
  permissions = [],
  businessType = null,
) {
  const availableModules = getAvailableModules(
    isAuthenticated,
    isAdmin,
    permissions,
    businessType,
  );
  const navItems = [];

  Object.entries(availableModules).forEach(([moduleKey, config]) => {
    config.navItems?.forEach((item) => {
      navItems.push({
        ...item,
        module: moduleKey,
      });
    });
  });

  return navItems;
}

export function hasAccessToRoute(
  pathname,
  isAuthenticated = false,
  isAdmin = false,
  permissions = [],
  businessType = null,
) {
  const routeConfig = findRouteConfig(pathname);
  if (!routeConfig) return false;
  if (!matchesBusiness(routeConfig.route || {}, businessType)) return false;

  const permNames = new Set((permissions || []).map((p) => p.name));
  const route = routeConfig.route;

  if (!route.requiresAuth) return true;

  if (route.requiresAuth && !isAuthenticated) return false;

  if (route.requiresAdmin && !isAdmin) return false;

  if (route.permissions && route.permissions.length > 0) {
    return route.permissions.every((k) => permNames.has(k));
  }

  return true;
}
