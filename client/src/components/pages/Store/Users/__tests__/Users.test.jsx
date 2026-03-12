import { render, screen, fireEvent, act } from "@testing-library/react";

import * as useModulesHook from "@/hooks/useModules";
import { I18nProvider } from "@/i18n/I18nProvider";
import * as configurationsProvider from "@/providers/configurations/configurationsProvider";

import { Users } from "../Users";

const mockAddUser = jest.fn(() => Promise.resolve());
const mockUpdateUser = jest.fn(() => Promise.resolve());
const mockDeleteUser = jest.fn(() => Promise.resolve());
let mockRoles = [
  { id: "admin", role: "Admin" },
  { id: "seller", role: "Seller" },
];

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/store/users"),
}));

jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
  RequirePermission: ({ children }) => children,
}));

jest.mock("../AddUsersModal", () => ({
  AddUsersModal: ({ addUsersShowModal, data, onChange, addUser }) => (
    addUsersShowModal ? (
      <div>
        modal.titleAdd
        <label>
          <span>modal.userNameLabel</span>
          <input
            aria-label="modal.userNameLabel"
            value={data?.userName || ""}
            onChange={(e) => onChange?.({ userName: e.target.value })}
          />
        </label>
        <button onClick={() => addUser?.(data)}>modal.submitButton</button>
      </div>
    ) : null
  ),
}));

jest.mock("../EditUsersModal", () => ({
  EditUsersModal: ({ editUsersShowModal, data, onChange, updateUser, user }) => (
    editUsersShowModal ? (
      <div>
        modal.titleEdit
        <input
          aria-label="modal.userNameLabel"
          value={data?.userName || user?.name || ""}
          onChange={(e) => onChange?.({ userName: e.target.value })}
        />
        <input
          aria-label="modal.userPhoneLabel"
          value={data?.userPhone || user?.phone || ""}
          onChange={(e) => onChange?.({ userPhone: e.target.value })}
        />
        <button onClick={() => updateUser?.(data)}>modal.editButton</button>
      </div>
    ) : null
  ),
}));

jest.mock("../DeleteUsersModal", () => ({
  DeleteUsersModal: ({ deleteUsersShowModal, onConfirm }) => (
    deleteUsersShowModal ? (
      <div>
        modal.titleDelete
        <button onClick={() => onConfirm?.()}>modal.deleteButton</button>
      </div>
    ) : null
  ),
}));

jest.mock("../../hooks/useUsers", () => ({
  useUsers: () => ({
    users: [
      {
        id: 1,
        name: "Jordano Anaya",
        phone: "4431342288",
        pin: "1234",
      },
      {
        id: 2,
        name: "Carlos Ruz",
        phone: "4431234567",
        pin: "5678",
      },
      {
        id: 0,
        name: undefined,
        phone: undefined,
        email: undefined,
        role_id: undefined,
      },
    ],
    updateUser: mockUpdateUser,
    addUser: mockAddUser,
    deleteUser: mockDeleteUser,
  }),
}));

jest.mock("../../hooks/useRoles", () => ({
  useRoles: () => ({
    roles: mockRoles,
  }),
}));

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

function renderUsers() {
  return render(
    <I18nProvider>
      <Users />
    </I18nProvider>,
  );
}

const defaultNavigation = [
  {
    path: "/store/users",
    label: "users",
    icon: "users",
    showInNavbar: true,
  },
];
const mockLogout = jest.fn();
const mockConfig = {
  businessName: "Mi Tienda Test",
  businessType: "store",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRoles = [
    { id: "admin", role: "Admin" },
    { id: "seller", role: "Seller" },
  ];

  jest.spyOn(useModulesHook, "useModules").mockReturnValue({
    availableModules: {},
    availableNavigation: defaultNavigation,
    checkRouteAccess: jest.fn(),
    isAuth: true,
    isAdmin: false,
    isLoading: false,
    user: { userName: "testuser" },
    logout: mockLogout,
  });

  jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
    config: mockConfig,
    isLoading: false,
    businessType: "store",
    refreshConfig: jest.fn(),
    setConfig: jest.fn(),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Users page", () => {
  it("renders the table and header", async () => {
    await act(async () => {
      renderUsers();
    });

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("addUser")).toBeInTheDocument();
    expect(screen.getByText("Jordano Anaya")).toBeInTheDocument();
    expect(screen.getByText("Carlos Ruz")).toBeInTheDocument();
  });

  it("opens AddUsersModal when clicking Add User", async () => {
    await act(async () => {
      renderUsers();
    });

    const btn = screen.getByText("addUser");
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(screen.getByText("modal.titleAdd")).toBeInTheDocument();
  });

  it("opens EditUsersModal with correct user data", async () => {
    await act(async () => {
      renderUsers();
    });

    const editButtons = screen.getAllByRole("button", {
      name: "Edit User",
    });

    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    expect(screen.getByText("modal.titleEdit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jordano Anaya")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4431342288")).toBeInTheDocument();
  });

  it("opens DeleteUsersModal", async () => {
    await act(async () => {
      renderUsers();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: "Delete User",
    });

    await act(async () => {
      fireEvent.click(deleteButtons[1]);
    });

    expect(screen.getByText("modal.titleDelete")).toBeInTheDocument();
  });

  it("uses fallback values when user data is missing", async () => {
    await act(async () => {
      renderUsers();
    });

    const editButtons = screen.getAllByRole("button", {
      name: "Edit User",
    });

    await act(async () => {
      fireEvent.click(editButtons[2]);
    });

    expect(screen.getByLabelText("modal.userNameLabel")).toHaveValue("");
    expect(screen.getByLabelText("modal.userPhoneLabel")).toHaveValue("");
  });

  it("merges data correctly with handleDataChange", async () => {
    await act(async () => {
      renderUsers();
    });

    const editButtons = screen.getAllByRole("button", {
      name: "Edit User",
    });

    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    fireEvent.change(screen.getByDisplayValue("Jordano Anaya"), { target: { value: "Updated User" } });

    expect(screen.getByDisplayValue("Updated User")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4431342288")).toBeInTheDocument();
  });

  it("confirms delete user from modal", async () => {
    await act(async () => {
      renderUsers();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: "Delete User",
    });

    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("modal.deleteButton"));
    });

    expect(mockDeleteUser).toHaveBeenCalledWith(1);
  });

  it("does not delete when user id is missing", async () => {
    await act(async () => {
      renderUsers();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: "Delete User",
    });

    await act(async () => {
      fireEvent.click(deleteButtons[2]);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("modal.deleteButton"));
    });

    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("uses empty role when no roles are available", async () => {
    mockRoles = [];

    await act(async () => {
      renderUsers();
    });

    const btn = screen.getByText("addUser");
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(screen.getByLabelText("modal.userNameLabel")).toHaveValue("");

    mockRoles = [
      { id: "admin", role: "Admin" },
      { id: "seller", role: "Seller" },
    ];
  });
});
