import { getAvailableFeatures } from "../features";

const findRoute = (available, path) => Object.values(available)
  .flatMap((feature) => feature.routes)
  .find((route) => route.path === path);

describe("getAvailableFeatures", () => {
  it("includes /store/reports for a non-admin user with reports_read", () => {
    const available = getAvailableFeatures(true, false, [{ name: "reports_read" }], "store");
    expect(findRoute(available, "/store/reports")).toBeDefined();
  });

  it("excludes /store/reports for a user without reports_read, even with wallet_read", () => {
    const available = getAvailableFeatures(true, false, [{ name: "wallet_read" }], "store");
    expect(findRoute(available, "/store/reports")).toBeUndefined();
  });
});
