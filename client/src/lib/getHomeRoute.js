import { modules, matchesBusiness } from "./modules";
import { homeRoutesByUserType, homeRoutePriority } from "./homeRoutes";

function firstRouteForModule(moduleKey, businessType = null) {
  const mod = modules[moduleKey];
  if (!mod || !mod.enabled) return null;
  const route = (mod.routes || []).find((r) =>
    matchesBusiness(r, businessType),
  );
  return route ? route.path : null;
}

function fallbackAnyRoute(businessType = null) {
  for (const [, mod] of Object.entries(modules)) {
    if (!mod.enabled) continue;
    const route = (mod.routes || []).find((r) => matchesBusiness(r, businessType));
    if (route) return route.path;
  }
  return "/";
}

export function getHomeRoute(user = null, businessType = null) {
  // Prefer an explicit default route flagged in modules
  for (const [, mod] of Object.entries(modules)) {
    if (!mod?.enabled) continue;
    const def = (mod.routes || []).find(
      (r) => r?.default === true && matchesBusiness(r, businessType),
    );
    if (def) return def.path;
  }

  if (!user) {
    for (const entry of homeRoutePriority) {
      if (entry.module === "default") {
        if (!entry.route || matchesBusiness(entry.route, businessType)) {
          return entry.route || fallbackAnyRoute(businessType);
        }
      } else if (modules[entry.module]?.enabled) {
        const path = firstRouteForModule(entry.module, businessType);
        if (path) return path;
      }
    }
    return fallbackAnyRoute(businessType);
  }

  let userRoutes = [];

  if (user.role && homeRoutesByUserType.roles[user.role]) {
    userRoutes = homeRoutesByUserType.roles[user.role];
  } else if (user.isAdmin && homeRoutesByUserType.admin) {
    userRoutes = homeRoutesByUserType.admin;
  } else if (!user.isAdmin && homeRoutesByUserType.user) {
    userRoutes = homeRoutesByUserType.user;
  } else {
    userRoutes = homeRoutePriority;
  }

  for (const entry of userRoutes) {
    if (entry.module === "default") {
      if (!entry.route || matchesBusiness(entry.route, businessType)) {
        return entry.route || fallbackAnyRoute(businessType);
      }
    } else if (modules[entry.module]?.enabled) {
      const path = firstRouteForModule(entry.module, businessType);
      if (path) {
        console.log(
          `🏠 Ruta home para ${user.isAdmin ? "admin" : "usuario"}: ${path}`,
        );
        return path;
      }
    }
  }

  return fallbackAnyRoute(businessType);
}
