import { getAvailableNavigation } from "../features";

describe("notification navigation", () => {
  it("shows notifications only for admins", () => {
    const nonAdminNavigation = getAvailableNavigation(true, false, [], "store");
    const adminNavigation = getAvailableNavigation(true, true, [], "store");

    expect(nonAdminNavigation.some((item) => item.path === "/store/notifications")).toBe(false);
    expect(adminNavigation.some((item) => item.path === "/store/notifications")).toBe(true);
  });
});
