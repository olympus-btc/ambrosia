import { render, screen, fireEvent } from "@testing-library/react";

import { RolesCard } from "../RolesCard";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children }) => <>{children}</>,
}));

jest.mock("@/components/shared/EditButton", () => ({
  EditButton: ({ onPress, "aria-label": ariaLabel }) => (
    <button aria-label={ariaLabel} onClick={onPress}>edit</button>
  ),
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress, "aria-label": ariaLabel }) => (
    <button aria-label={ariaLabel} onClick={onPress}>delete</button>
  ),
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Chip: ({ children }) => <span>{children}</span>,
}));

jest.mock("../../utils/roleTemplates", () => ({
  resolveRoleName: (role) => role,
}));

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const adminRole = { id: "1", role: "admin", isAdmin: true };
const standardRole = { id: "2", role: "cashier", isAdmin: false };

describe("RolesCard", () => {
  it("renders role name", () => {
    render(<RolesCard role={adminRole} canManageRoles={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("renders admin chip for admin role", () => {
    render(<RolesCard role={adminRole} canManageRoles={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText("roles.labels.adminChip")).toBeInTheDocument();
  });

  it("renders standard chip for non-admin role", () => {
    render(<RolesCard role={standardRole} canManageRoles={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText("roles.labels.standardChip")).toBeInTheDocument();
  });

  it("hides action buttons when canManageRoles is false", () => {
    render(<RolesCard role={adminRole} canManageRoles={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.queryByLabelText("Edit Role")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Delete Role")).not.toBeInTheDocument();
  });

  it("shows action buttons when canManageRoles is true", () => {
    render(<RolesCard role={adminRole} canManageRoles onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByLabelText("Edit Role")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete Role")).toBeInTheDocument();
  });

  it("calls onEdit when edit is pressed", () => {
    const onEdit = jest.fn();
    render(<RolesCard role={adminRole} canManageRoles onEdit={onEdit} onDelete={jest.fn()} />);
    fireEvent.click(screen.getByLabelText("Edit Role"));
    expect(onEdit).toHaveBeenCalledWith(adminRole);
  });

  it("calls onDelete when delete is pressed", () => {
    const onDelete = jest.fn();
    render(<RolesCard role={adminRole} canManageRoles onEdit={jest.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText("Delete Role"));
    expect(onDelete).toHaveBeenCalledWith(adminRole);
  });
});
