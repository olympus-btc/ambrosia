import { features, matchesBusiness } from "./features";
import { homeRoutesByUserType, homeRoutePriority } from "./homeRoutes";

function firstRouteForFeature(featureKey, businessType = null) {
  const feature = features[featureKey];
  if (!feature || !feature.enabled) return null;
  const route = (feature.routes || []).find((r) => matchesBusiness(r, businessType));
  return route ? route.path : null;
}

function fallbackAnyRoute(businessType = null) {
  for (const [, feature] of Object.entries(features)) {
    if (!feature.enabled) continue;
    const route = (feature.routes || []).find((r) => matchesBusiness(r, businessType));
    if (route) return route.path;
  }
  return "/";
}

export function getHomeRoute(user = null, businessType = null) {
  for (const [, feature] of Object.entries(features)) {
    if (!feature?.enabled) continue;
    const def = (feature.routes || []).find(
      (r) => r?.default === true && matchesBusiness(r, businessType),
    );
    if (def) return def.path;
  }

  if (!user) {
    for (const entry of homeRoutePriority) {
      if (entry.feature === "default") {
        if (!entry.route || matchesBusiness(entry.route, businessType)) {
          return entry.route || fallbackAnyRoute(businessType);
        }
      } else if (features[entry.feature]?.enabled) {
        const path = firstRouteForFeature(entry.feature, businessType);
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
    if (entry.feature === "default") {
      if (!entry.route || matchesBusiness(entry.route, businessType)) {
        return entry.route || fallbackAnyRoute(businessType);
      }
    } else if (features[entry.feature]?.enabled) {
      const path = firstRouteForFeature(entry.feature, businessType);
      if (path) return path;
    }
  }

  return fallbackAnyRoute(businessType);
}
