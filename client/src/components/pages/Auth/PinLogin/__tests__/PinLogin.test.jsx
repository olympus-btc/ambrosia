import { useRouter } from "next/navigation";

import { act, render, screen, fireEvent } from "@testing-library/react";

import { useAuth } from "@/hooks/auth/useAuth";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getUsers } from "@/modules/auth/authService";
import { useConfigurations } from "@/providers/configurations/configurationsProvider";

import PinLogin from "../index";

jest.mock("@/modules/auth/authService", () => ({
  getUsers: jest.fn(),
}));

jest.mock("@/hooks/auth/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/providers/configurations/configurationsProvider", () => ({
  useConfigurations: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
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
  useRouter.mockReturnValue({ push: mockPush, replace: mockReplace });
  useAuth.mockReturnValue({ login: mockLogin, isAuth: false, isLoading: false });
  useConfigurations.mockReturnValue({ config: { businessName: "Test Store", businessLogoUrl: null } });
  getUsers.mockResolvedValue(employees);
});

describe("PinLogin", () => {
  it("renders PIN input and employee select", async () => {
    await renderPinLogin();
    expect(screen.getByPlaceholderText("----")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /loginButton/i })).toBeInTheDocument();
  });

  it("renders number pad buttons 0-9", async () => {
    await renderPinLogin();
    for (const n of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) {
      expect(screen.getByRole("button", { name: n })).toBeInTheDocument();
    }
  });

  it("fills PIN up to 4 digits when number buttons are clicked", async () => {
    await renderPinLogin();
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "4" }));

    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(screen.getByPlaceholderText("----")).toHaveValue("1234");
  });

  it("erase button removes last digit", async () => {
    await renderPinLogin();
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: /eraseButton/i }));
    expect(screen.getByPlaceholderText("----")).toHaveValue("1");
  });

  it("clear button empties the PIN", async () => {
    await renderPinLogin();
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: /clearButton/i }));
    expect(screen.getByPlaceholderText("----")).toHaveValue("");
  });

  it("shows error when submitting without selecting an employee", async () => {
    await renderPinLogin();
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    fireEvent.click(screen.getByRole("button", { name: /loginButton/i }));

    expect(screen.getByText(/errorMessages.selectEmployee/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("login button is disabled when PIN is empty", async () => {
    await renderPinLogin();
    expect(screen.getByRole("button", { name: /loginButton/i })).toBeDisabled();
  });

  it("redirects to '/' when already authenticated", async () => {
    useAuth.mockReturnValue({ login: mockLogin, isAuth: true, isLoading: false });
    await renderPinLogin();
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("shows no-employees message when getUsers returns empty array", async () => {
    getUsers.mockResolvedValue([]);
    await renderPinLogin();
    expect(screen.getByText(/noEmployees/i)).toBeInTheDocument();
  });
});
