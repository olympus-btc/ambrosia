export const homeRoutesByUserType = {
  admin: [
    { feature: "spaces", route: "/rooms" },
    { feature: "default", route: "/all-orders" },
  ],
  user: [{ feature: "spaces", route: "/rooms" }],
  roles: {},
};

export const homeRoutePriority = homeRoutesByUserType.admin;
