import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as useAuthHook from "@hooks/auth/useAuth";
import { I18nProvider } from "@i18n/I18nProvider";

import { Unauthorized } from "../Unauthorized";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: mockPush })),
}));

jest.mock("lucide-react", () => ({
  ShieldOff: () => <div>ShieldOff Icon</div>,
  ArrowLeft: () => <div>ArrowLeft Icon</div>,
  LogIn: () => <div>LogIn Icon</div>,
  Languages: () => <div>Languages Icon</div>,
}));

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(() => Promise.resolve({})),
}));

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const renderUnauthorized = () => render(
  <I18nProvider>
    <Unauthorized />
  </I18nProvider>,
);

describe("Unauthorized", () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.spyOn(useAuthHook, "useAuth").mockReturnValue({
      logout: mockLogout,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders the error code", async () => {
      await act(async () => renderUnauthorized());
      expect(screen.getByText("errorCode")).toBeInTheDocument();
    });

    it("renders the heading", async () => {
      await act(async () => renderUnauthorized());
      expect(screen.getByText("heading")).toBeInTheDocument();
    });

    it("renders the description", async () => {
      await act(async () => renderUnauthorized());
      expect(screen.getByText("description")).toBeInTheDocument();
    });

    it("renders the go home button", async () => {
      await act(async () => renderUnauthorized());
      expect(screen.getByText("goHome")).toBeInTheDocument();
    });

    it("renders the login button", async () => {
      await act(async () => renderUnauthorized());
      expect(screen.getByText("login")).toBeInTheDocument();
    });

    it("renders the shield icon", async () => {
      await act(async () => renderUnauthorized());
      expect(screen.getByText("ShieldOff Icon")).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("navigates to home when go home button is pressed", async () => {
      const user = userEvent.setup();
      await act(async () => renderUnauthorized());

      await user.click(screen.getByText("goHome"));

      expect(mockPush).toHaveBeenCalledWith("/");
    });

    it("calls logout and navigates to auth when login button is pressed", async () => {
      mockLogout.mockResolvedValue();
      const user = userEvent.setup();
      await act(async () => renderUnauthorized());

      await user.click(screen.getByText("login"));

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/auth");
    });

    it("navigates to auth only after logout completes", async () => {
      let resolveLogout;
      mockLogout.mockReturnValue(new Promise((res) => (resolveLogout = res)));
      const user = userEvent.setup();
      await act(async () => renderUnauthorized());

      await user.click(screen.getByText("login"));
      expect(mockPush).not.toHaveBeenCalledWith("/auth");

      await act(async () => resolveLogout());
      expect(mockPush).toHaveBeenCalledWith("/auth");
    });
  });
});
