import { render, screen } from "@testing-library/react";

import { usePermission, RequirePermission } from "../usePermission";

jest.mock("@/hooks/auth/useAuth", () => ({
  useAuth: () => ({
    permissions: [
      { name: "orders_read" },
      { name: "products_read" },
      { name: "users_read" },
    ],
  }),
}));

function PermissionCheck({ allOf, anyOf }) {
  const allowed = usePermission({ allOf, anyOf });
  return <span data-testid="result">{allowed ? "yes" : "no"}</span>;
}

describe("usePermission", () => {
  it("returns true when allOf permissions are present", () => {
    render(<PermissionCheck allOf={["orders_read", "products_read"]} />);
    expect(screen.getByTestId("result")).toHaveTextContent("yes");
  });

  it("returns false when one of allOf permissions is missing", () => {
    render(<PermissionCheck allOf={["orders_read", "roles_read"]} />);
    expect(screen.getByTestId("result")).toHaveTextContent("no");
  });

  it("returns true when at least one anyOf permission is present", () => {
    render(<PermissionCheck anyOf={["roles_read", "orders_read"]} />);
    expect(screen.getByTestId("result")).toHaveTextContent("yes");
  });

  it("returns false when none of anyOf permissions are present", () => {
    render(<PermissionCheck anyOf={["roles_read", "payments_read"]} />);
    expect(screen.getByTestId("result")).toHaveTextContent("no");
  });

  it("returns true when both allOf and anyOf are empty", () => {
    render(<PermissionCheck allOf={[]} anyOf={[]} />);
    expect(screen.getByTestId("result")).toHaveTextContent("yes");
  });

  it("returns true when allOf and anyOf both pass", () => {
    render(<PermissionCheck allOf={["orders_read"]} anyOf={["products_read"]} />);
    expect(screen.getByTestId("result")).toHaveTextContent("yes");
  });

  it("returns false when allOf passes but anyOf fails", () => {
    render(<PermissionCheck allOf={["orders_read"]} anyOf={["roles_read"]} />);
    expect(screen.getByTestId("result")).toHaveTextContent("no");
  });
});

describe("RequirePermission", () => {
  it("renders children when permission is granted", () => {
    render(
      <RequirePermission allOf={["orders_read"]}>
        <span>protected content</span>
      </RequirePermission>,
    );
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  it("renders nothing when permission is denied", () => {
    render(
      <RequirePermission allOf={["roles_read"]}>
        <span>protected content</span>
      </RequirePermission>,
    );
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("renders fallback when permission is denied and fallback is provided", () => {
    render(
      <RequirePermission allOf={["roles_read"]} fallback={<span>no access</span>}>
        <span>protected content</span>
      </RequirePermission>,
    );
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.getByText("no access")).toBeInTheDocument();
  });

  it("renders children with anyOf when at least one permission matches", () => {
    render(
      <RequirePermission anyOf={["roles_read", "users_read"]}>
        <span>visible</span>
      </RequirePermission>,
    );
    expect(screen.getByText("visible")).toBeInTheDocument();
  });
});
