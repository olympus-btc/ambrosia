import { useRouter } from "next/navigation";

import { addToast } from "@heroui/react";
import { act, render, screen, fireEvent } from "@testing-library/react";

import { useAuth } from "@/hooks/auth/useAuth";
import { I18nProvider } from "@/i18n/I18nProvider";
import { useConfigurations } from "@/providers/configurations/configurationsProvider";
import { getPublicUsers } from "@/services/authService";

import PinLogin from "../PinLogin";

jest.mock("../EmployeeSelect", () => ({
  EmployeeSelect: ({ employees, onSelect }) => (
    <div>
      <label>selectLabel</label>
      {employees.length > 0
        ? employees.map((employee) => (
          <button key={employee.id} onClick={() => onSelect(employee.id)}>{employee.name}</button>
        ))
        : <span>noEmployees</span>
      }
    </div>
  ),
}));

jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  addToast: jest.fn(),
}));

jest.mock("@/services/authService", () => ({ getPublicUsers: jest.fn() }));
jest.mock("@/hooks/auth/useAuth", () => ({ useAuth: jest.fn() }));
jest.mock("@/providers/configurations/configurationsProvider", () => ({ useConfigurations: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockLogin = jest.fn();

const employees = [
  { id: "1", name: "Alice", role: "cashier" },
  { id: "2", name: "Bob", role: "manager" },
];

const renderPinLogin = async () => {
  const pinLoginScreen = render(
    <I18nProvider>
      <PinLogin />
    </I18nProvider>,
  );
  await act(async () => {});
  return pinLoginScreen;
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  useRouter.mockReturnValue({ push: mockPush, replace: mockReplace });
  useAuth.mockReturnValue({ login: mockLogin, isAuth: false, isLoading: false });
  useConfigurations.mockReturnValue({
    config: { businessName: "Test Store", businessLogoUrl: null },
    businessType: "store",
  });
  getPublicUsers.mockResolvedValue(employees);
});

describe("PinLogin", () => {
  it("renders all sections: header, employee select and pin pad", async () => {
    await renderPinLogin();
    expect(screen.getByText("Test Store")).toBeInTheDocument();
    expect(screen.getAllByText("selectLabel")[0]).toBeInTheDocument();
    expect(screen.getByPlaceholderText("------")).toBeInTheDocument();
  });

  it("loads and displays employees from the API", async () => {
    await renderPinLogin();
    expect(getPublicUsers).toHaveBeenCalledWith();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows no-employees message when API returns empty array", async () => {
    getPublicUsers.mockResolvedValue([]);
    await renderPinLogin();
    expect(screen.getByText("noEmployees")).toBeInTheDocument();
  });

  it("shows an error toast when employees cannot be loaded", async () => {
    getPublicUsers.mockRejectedValueOnce(new Error("Users unavailable"));

    await renderPinLogin();

    expect(addToast).toHaveBeenCalledWith({
      title: "errorMessages.loadEmployeesTitle",
      description: "errorMessages.loadEmployeesDescription",
      color: "danger",
    });
  });

  it("redirects to '/' when already authenticated", async () => {
    useAuth.mockReturnValue({ login: mockLogin, isAuth: true, isLoading: false });
    await renderPinLogin();
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("shows lockout message after a 429 response from the server", async () => {
    const rateLimitError = new Error("Too many requests");
    rateLimitError.status = 429;
    rateLimitError.retryAfter = 180;
    mockLogin.mockRejectedValue(rateLimitError);

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

  it("shows the specific error message when the user's role is deleted", async () => {
    const specificMessage = "No assigned role for this user, contact Admin";
    const missingRoleError = new Error(specificMessage);
    mockLogin.mockRejectedValue(missingRoleError);

    await renderPinLogin();

    fireEvent.click(screen.getByText("Alice"));
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "3" });
    fireEvent.keyDown(window, { key: "4" });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Enter" });
    });

    expect(screen.getByText(specificMessage)).toBeInTheDocument();
  });

  it("shows the PIN deprecation modal after a successful login with a 4-digit PIN", async () => {
    mockLogin.mockResolvedValue({});

    await renderPinLogin();

    fireEvent.click(screen.getByText("Alice"));
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "3" });
    fireEvent.keyDown(window, { key: "4" });
    await act(async () => {
      fireEvent.keyDown(window, { key: "Enter" });
    });

    expect(screen.getByText("pinDeprecation.title")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("pinDeprecation.goToUsersButton"));
    expect(mockPush).toHaveBeenCalledWith("/store/users");
  });

  it("keeps the deprecation modal open when the session turns authenticated", async () => {
    mockLogin.mockImplementation(async () => {
      useAuth.mockReturnValue({ login: mockLogin, isAuth: true, isLoading: false });
      return {};
    });

    await renderPinLogin();

    fireEvent.click(screen.getByText("Alice"));
    "1234".split("").forEach((digit) => fireEvent.keyDown(window, { key: digit }));
    await act(async () => {
      fireEvent.keyDown(window, { key: "Enter" });
    });

    expect(screen.getByText("pinDeprecation.title")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirects home from the deprecation modal when the business type is unknown", async () => {
    useConfigurations.mockReturnValue({
      config: { businessName: "Test Store", businessLogoUrl: null },
      businessType: null,
    });
    mockLogin.mockResolvedValue({});

    await renderPinLogin();

    fireEvent.click(screen.getByText("Alice"));
    "1234".split("").forEach((digit) => fireEvent.keyDown(window, { key: digit }));
    await act(async () => {
      fireEvent.keyDown(window, { key: "Enter" });
    });

    fireEvent.click(screen.getByText("pinDeprecation.goToUsersButton"));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("closes the deprecation modal and redirects home when the user postpones the PIN update", async () => {
    mockLogin.mockResolvedValue({});

    await renderPinLogin();

    fireEvent.click(screen.getByText("Alice"));
    "12345".split("").forEach((digit) => fireEvent.keyDown(window, { key: digit }));
    await act(async () => {
      fireEvent.keyDown(window, { key: "Enter" });
    });

    expect(screen.getByText("pinDeprecation.title")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("pinDeprecation.laterButton"));
    });
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("does not show the deprecation modal and redirects home after a 6-digit PIN login", async () => {
    mockLogin.mockResolvedValue({});

    await renderPinLogin();

    fireEvent.click(screen.getByText("Alice"));
    "123456".split("").forEach((digit) => fireEvent.keyDown(window, { key: digit }));
    await act(async () => {
      fireEvent.keyDown(window, { key: "Enter" });
    });

    expect(screen.queryByText("pinDeprecation.title")).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
