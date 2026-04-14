import { useRouter } from "next/navigation";

import { act, render, screen, fireEvent } from "@testing-library/react";

import { useAuth } from "@/hooks/auth/useAuth";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getUsers } from "@/modules/auth/authService";
import { useConfigurations } from "@/providers/configurations/configurationsProvider";

import PinLogin from "../PinLogin";

jest.mock("../EmployeeSelect", () => ({
  EmployeeSelect: ({ employees, onSelect }) => (
    <div>
      <label>selectLabel</label>
      {employees.length > 0
        ? employees.map((emp) => (
          <button key={emp.id} onClick={() => onSelect(emp.id)}>{emp.name}</button>
        ))
        : <span>noEmployees</span>
      }
    </div>
  ),
}));

jest.mock("@/modules/auth/authService", () => ({ getUsers: jest.fn() }));
jest.mock("@/hooks/auth/useAuth", () => ({ useAuth: jest.fn() }));
jest.mock("@/providers/configurations/configurationsProvider", () => ({ useConfigurations: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));

const mockReplace = jest.fn();
const mockLogin = jest.fn();

const employees = [
  { id: "1", name: "Alice", role: "cashier" },
  { id: "2", name: "Bob", role: "manager" },
];

const renderPinLogin = async () => {
  const result = render(
    <I18nProvider>
      <PinLogin />
    </I18nProvider>,
  );
  await act(async () => {});
  return result;
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  useRouter.mockReturnValue({ push: jest.fn(), replace: mockReplace });
  useAuth.mockReturnValue({ login: mockLogin, isAuth: false, isLoading: false });
  useConfigurations.mockReturnValue({ config: { businessName: "Test Store", businessLogoUrl: null } });
  getUsers.mockResolvedValue(employees);
});

describe("PinLogin", () => {
  it("renders all sections: header, employee select and pin pad", async () => {
    await renderPinLogin();
    expect(screen.getByText("Test Store")).toBeInTheDocument();
    expect(screen.getAllByText("selectLabel")[0]).toBeInTheDocument();
    expect(screen.getByPlaceholderText("----")).toBeInTheDocument();
  });

  it("loads and displays employees from the API", async () => {
    await renderPinLogin();
    expect(getUsers).toHaveBeenCalledWith({ silentAuth: true });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows no-employees message when API returns empty array", async () => {
    getUsers.mockResolvedValue([]);
    await renderPinLogin();
    expect(screen.getByText("noEmployees")).toBeInTheDocument();
  });

  it("redirects to '/' when already authenticated", async () => {
    useAuth.mockReturnValue({ login: mockLogin, isAuth: true, isLoading: false });
    await renderPinLogin();
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("shows lockout message after a 429 response from the server", async () => {
    const err = new Error("Too many requests");
    err.status = 429;
    err.retryAfter = 180;
    mockLogin.mockRejectedValue(err);

    await renderPinLogin();

    fireEvent.click(screen.getByText("Alice"));
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "3" });
    fireEvent.keyDown(window, { key: "4" });
    await act(async () => {
      fireEvent.keyDown(window, { key: "Enter" });
    });

    expect(screen.getByText(/lockout\.message/)).toBeInTheDocument();
  });

  it("does not show lockout message after a successful login", async () => {
    mockLogin.mockResolvedValue({});

    await renderPinLogin();

    fireEvent.click(screen.getByText("Alice"));
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "3" });
    await act(async () => {
      fireEvent.keyDown(window, { key: "4" });
    });
    await act(async () => {
      fireEvent.keyDown(window, { key: "Enter" });
    });

    expect(screen.queryByText(/lockout\.message/)).not.toBeInTheDocument();
  });
});
