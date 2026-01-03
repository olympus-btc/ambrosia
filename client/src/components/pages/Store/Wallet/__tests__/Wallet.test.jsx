import { render, screen, act } from "@testing-library/react";

import * as useModulesHook from "@hooks/useModules";
import { I18nProvider } from "@i18n/I18nProvider";
import { AuthContext } from "@modules/auth/AuthProvider";
import * as configurationsProvider from "@providers/configurations/configurationsProvider";

import { Wallet } from "../Wallet";

jest.mock("../StoreWallet", () => ({
  StoreWallet: () => <div data-testid="store-wallet-mock">StoreWallet Content</div>,
}));

function renderWallet() {
  const mockAuthContext = {
    user: { userName: "testuser", userId: 1 },
    isAuth: true,
  };

  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <I18nProvider>
        <Wallet />
      </I18nProvider>
    </AuthContext.Provider>,
  );
}

const originalWarn = console.warn;
const originalError = console.error;

const defaultNavigation = [
  {
    path: "/store/wallet",
    label: "wallet",
    icon: "wallet",
    showInNavbar: true,
  },
];

const mockLogout = jest.fn();
const mockUpdateConfig = jest.fn();

const mockConfig = {
  businessName: "Mi Tienda Test",
  businessType: "store",
};

beforeEach(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("aria-label")
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("onAnimationComplete") ||
       args[0].includes("Unknown event handler property") ||
       args[0].includes("validateDOMNesting"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  jest.clearAllMocks();

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
    updateConfig: mockUpdateConfig,
  });
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

describe("Wallet page", () => {
  describe("Rendering", () => {
    it("renders wallet title", async () => {
      await act(async () => {
        renderWallet();
      });

      expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("renders wallet subtitle", async () => {
      await act(async () => {
        renderWallet();
      });

      expect(screen.getByText("subtitle")).toBeInTheDocument();
    });
  });
});
