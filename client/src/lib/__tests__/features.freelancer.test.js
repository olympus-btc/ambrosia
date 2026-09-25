import { features, getAvailableFeatures, getAvailableNavigation } from "../features";
import { getHomeRoute } from "../getHomeRoute";

const FREELANCER_PATH_PREFIX = "/freelancer";

const allPermissions = Object.values(features)
  .flatMap((feature) => feature.routes)
  .flatMap((route) => route.permissions || [])
  .map((name) => ({ name }));

const availableRoutePaths = (available) => Object.values(available)
  .flatMap((feature) => feature.routes)
  .map((route) => route.path);

const isFreelancerPath = (path) => path.startsWith(FREELANCER_PATH_PREFIX);

describe("freelancer feature", () => {
  const { routes, navItems } = features.freelancer;

  it.each(routes.map((route) => [route.path, route]))(
    "declares an explicit freelance type on %s",
    (_path, route) => {
      expect(route.types).toEqual(["freelance"]);
    },
  );

  it.each(navItems.map((navItem) => [navItem.path]))(
    "backs nav item %s with a declared route",
    (path) => {
      expect(routes.some((route) => route.path === path)).toBe(true);
    },
  );

  it.each(["store", "restaurant"])(
    "hides every freelancer route and nav item from a %s session",
    (businessType) => {
      const available = getAvailableFeatures(true, true, allPermissions, businessType);
      const navigation = getAvailableNavigation(true, true, allPermissions, businessType);

      expect(availableRoutePaths(available).filter(isFreelancerPath)).toEqual([]);
      expect(navigation.map((item) => item.path).filter(isFreelancerPath)).toEqual([]);
    },
  );

  it("shows every freelancer route and nav item to a freelance admin", () => {
    const available = getAvailableFeatures(true, true, allPermissions, "freelance");
    const navigation = getAvailableNavigation(true, true, allPermissions, "freelance");

    expect(availableRoutePaths(available)).toEqual(expect.arrayContaining(routes.map((route) => route.path)));
    expect(navigation.map((item) => item.path)).toEqual(expect.arrayContaining(navItems.map((item) => item.path)));
  });

  it("excludes /freelancer/clients for a non-admin user without clients_read", () => {
    const available = getAvailableFeatures(true, false, [{ name: "projects_read" }], "freelance");

    expect(availableRoutePaths(available)).not.toContain("/freelancer/clients");
    expect(availableRoutePaths(available)).toContain("/freelancer/projects");
  });

  it.each([
    ["freelance", "/freelancer"],
    ["store", "/store"],
  ])("sends a %s login to %s", (businessType, expectedRoute) => {
    expect(getHomeRoute({ isAdmin: true }, businessType)).toBe(expectedRoute);
  });
});
