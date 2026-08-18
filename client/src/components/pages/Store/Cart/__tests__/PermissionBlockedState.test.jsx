import { render, screen } from "@testing-library/react";

import { PermissionBlockedState } from "../PermissionBlockedState";

describe("PermissionBlockedState", () => {
  it("always shows the title and subtitle", () => {
    render(<PermissionBlockedState missingPermissions={["products_read"]} />);

    expect(screen.getByText("permissionBlocked.title")).toBeInTheDocument();
    expect(screen.getByText("permissionBlocked.subtitle")).toBeInTheDocument();
  });

  it("lists a label for each missing permission", () => {
    render(<PermissionBlockedState missingPermissions={["products_read", "categories_read", "payments_read"]} />);

    expect(screen.getByText("permissionBlocked.products")).toBeInTheDocument();
    expect(screen.getByText("permissionBlocked.categories")).toBeInTheDocument();
    expect(screen.getByText("permissionBlocked.payments")).toBeInTheDocument();
  });

  it("renders no list items when nothing is missing", () => {
    render(<PermissionBlockedState missingPermissions={[]} />);

    expect(screen.queryByText("permissionBlocked.products")).not.toBeInTheDocument();
    expect(screen.queryByText("permissionBlocked.categories")).not.toBeInTheDocument();
    expect(screen.queryByText("permissionBlocked.payments")).not.toBeInTheDocument();
  });
});
