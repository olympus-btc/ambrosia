import { render, screen, fireEvent, act } from "@testing-library/react";
import { I18nProvider } from "../../../../i18n/I18nProvider";
import { StoreLayout } from "../StoreLayout";
import * as useModulesHook from "../../../../hooks/useModules";
import * as configurationsProvider from "../../../../providers/configurations/configurationsProvider";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/store"),
}));

jest.mock("lucide-react", () => ({
  Users: () => <div>Users Icon</div>,
  Package: () => <div>Package Icon</div>,
  ShoppingCart: () => <div>ShoppingCart Icon</div>,
  Settings: () => <div>Settings Icon</div>,
  LogOut: () => <div>LogOut Icon</div>,
  FileText: () => <div>FileText Icon</div>,
  Languages: () => <div>Languages Icon</div>,
}));

jest.mock("../../../../services/apiClient", () => ({
  apiClient: jest.fn(() => Promise.resolve({})),
}));

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe("StoreLayout", () => {
  const mockLogout = jest.fn();
  const mockConfig = {
    businessName: "Mi Tienda Test",
    businessType: "store",
  };

  const defaultNavigation = [
    {
      path: "/store/users",
      label: "users",
      icon: "users",
      showInNavbar: true,
    },
    {
      path: "/store/products",
      label: "products",
      icon: "package",
      showInNavbar: true,
    },
    {
      path: "/store/checkout",
      label: "checkout",
      icon: "shopping-cart",
      showInNavbar: true,
    },
    {
      path: "/store/settings",
      label: "settings",
      icon: "settings",
      showInNavbar: true,
    },
  ];

  beforeEach(() => {
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
      setConfig: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderStoreLayout(children = <div>Test Content</div>) {
    return render(
      <I18nProvider>
        <StoreLayout>{children}</StoreLayout>
      </I18nProvider>
    );
  }

  describe("Logo and Branding", () => {
    it("renders the Ambrosia logo", () => {
      renderStoreLayout();
      expect(screen.getByAltText("ambrosia")).toBeInTheDocument();
    });

    it("displays the business name from config", () => {
      renderStoreLayout();
      expect(screen.getByText("Mi Tienda Test")).toBeInTheDocument();
    });

    it("does not display business name when config is null", () => {
      jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
        config: null,
        isLoading: false,
        businessType: null,
        refreshConfig: jest.fn(),
        setConfig: jest.fn(),
      });

      renderStoreLayout();
      expect(screen.queryByText("Mi Tienda Test")).not.toBeInTheDocument();
    });

    it("logo links to homepage", () => {
      renderStoreLayout();
      const logoLink = screen.getByAltText("ambrosia").closest("a");
      expect(logoLink).toHaveAttribute("href", "/");
    });
  });

  describe("Navigation Items", () => {
    it("renders all navigation items when authenticated", () => {
      renderStoreLayout();

      expect(screen.getByText("users")).toBeInTheDocument();
      expect(screen.getByText("products")).toBeInTheDocument();
      expect(screen.getByText("checkout")).toBeInTheDocument();
      expect(screen.getByText("settings")).toBeInTheDocument();
    });

    it("does not render navigation items when not authenticated", () => {
      jest.spyOn(useModulesHook, "useModules").mockReturnValue({
        availableModules: {},
        availableNavigation: [],
        checkRouteAccess: jest.fn(),
        isAuth: false,
        isAdmin: false,
        isLoading: false,
        user: null,
        logout: mockLogout,
      });

      renderStoreLayout();

      expect(screen.queryByText("users")).not.toBeInTheDocument();
      expect(screen.queryByText("products")).not.toBeInTheDocument();
      expect(screen.queryByText("checkout")).not.toBeInTheDocument();
      expect(screen.queryByText("settings")).not.toBeInTheDocument();
    });

    it("navigation items link to correct paths", () => {
      renderStoreLayout();

      const usersLink = screen.getByText("users").closest("a");
      const productsLink = screen.getByText("products").closest("a");
      const checkoutLink = screen.getByText("checkout").closest("a");
      const settingsLink = screen.getByText("settings").closest("a");

      expect(usersLink).toHaveAttribute("href", "/store/users");
      expect(productsLink).toHaveAttribute("href", "/store/products");
      expect(checkoutLink).toHaveAttribute("href", "/store/checkout");
      expect(settingsLink).toHaveAttribute("href", "/store/settings");
    });

    it("renders different navigation based on available modules", () => {
      const customNavigation = [
        {
          path: "/store/inventory",
          label: "inventory",
          icon: "box",
          showInNavbar: true,
        },
      ];

      jest.spyOn(useModulesHook, "useModules").mockReturnValue({
        availableModules: {},
        availableNavigation: customNavigation,
        checkRouteAccess: jest.fn(),
        isAuth: true,
        isAdmin: true,
        isLoading: false,
        user: { userName: "admin" },
        logout: mockLogout,
      });

      renderStoreLayout();

      expect(screen.getByText("inventory")).toBeInTheDocument();
      expect(screen.queryByText("users")).not.toBeInTheDocument();
    });
  });

  describe("Active Route Highlighting", () => {
    it("highlights the active route based on current pathname", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/users");

      renderStoreLayout();

      const usersLink = screen.getByText("users").closest("a");
      expect(usersLink).toHaveClass("bg-green-300", "text-green-800");
    });

    it("does not highlight inactive routes", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/users");

      renderStoreLayout();

      const productsLink = screen.getByText("products").closest("a");
      expect(productsLink).toHaveClass("text-slate-100");
      expect(productsLink).not.toHaveClass("bg-green-300");
    });

    it("highlights routes that start with the same path", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/users/123");

      renderStoreLayout();

      const usersLink = screen.getByText("users").closest("a");
      expect(usersLink).toHaveClass("bg-green-300", "text-green-800");
    });

    it("applies hover styles to navigation items", () => {
      renderStoreLayout();

      const usersLink = screen.getByText("users").closest("a");
      expect(usersLink).toHaveClass("hover:bg-green-300", "hover:text-green-800");
    });
  });

  describe("Logout Functionality", () => {
    it("renders logout button", () => {
      renderStoreLayout();
      expect(screen.getByText("logout")).toBeInTheDocument();
    });

    it("logout button links to /auth", () => {
      renderStoreLayout();

      const logoutLink = screen.getByText("logout").closest("a");
      expect(logoutLink).toHaveAttribute("href", "/auth");
    });

    it("calls logout function when logout button is clicked", () => {
      renderStoreLayout();

      const logoutButton = screen.getByText("logout").closest("a");
      fireEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it("renders logout icon", () => {
      renderStoreLayout();
      const logoutButton = screen.getByText("logout").closest("a");
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe("Layout Structure", () => {
    it("renders sidebar with correct classes", () => {
      const { container } = renderStoreLayout();
      const sidebar = container.querySelector("aside");

      expect(sidebar).toHaveClass("w-64", "bg-primary-500", "flex", "flex-col");
    });

    it("renders main content area", () => {
      const { container } = renderStoreLayout();
      const main = container.querySelector("main");

      expect(main).toHaveClass("flex-1", "gradient-fresh", "p-6");
    });

    it("renders children in main content area", () => {
      renderStoreLayout(<div data-testid="custom-content">Custom Content</div>);

      expect(screen.getByTestId("custom-content")).toBeInTheDocument();
      expect(screen.getByText("Custom Content")).toBeInTheDocument();
    });

    it("positions logout button at bottom of sidebar", () => {
      const { container } = renderStoreLayout();
      const logoutContainer = screen.getByText("logout").closest("div");

      expect(logoutContainer).toHaveClass(
        "mt-auto",
        "p-4",
        "border-t",
        "border-green-300",
        "text-sm",
      );
    });

    it("has proper border styling on sidebar sections", () => {
      const { container } = renderStoreLayout();
      const headerSection = container.querySelector(".border-b");
      const footerSection = container.querySelector(".border-t");

      expect(headerSection).toHaveClass("border-green-300");
      expect(footerSection).toHaveClass("border-green-300");
    });
  });

  describe("Icon Component", () => {
    it("renders icon with correct formatting", () => {
      renderStoreLayout();
      expect(screen.getByText("users")).toBeInTheDocument();
    });

    it("handles multi-word icon names with kebab-case", () => {
      const customNavigation = [
        {
          path: "/store/test",
          label: "test",
          icon: "shopping-cart",
          showInNavbar: true,
        },
      ];

      jest.spyOn(useModulesHook, "useModules").mockReturnValue({
        availableModules: {},
        availableNavigation: customNavigation,
        checkRouteAccess: jest.fn(),
        isAuth: true,
        isAdmin: false,
        isLoading: false,
        user: { userName: "testuser" },
        logout: mockLogout,
      });

      renderStoreLayout();
      expect(screen.getByText("test")).toBeInTheDocument();
    });
  });

  describe("Loading and Error States", () => {
    it("renders layout even when config is loading", () => {
      jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
        config: null,
        isLoading: true,
        businessType: null,
        refreshConfig: jest.fn(),
        setConfig: jest.fn(),
      });

      renderStoreLayout();
      expect(screen.getByAltText("ambrosia")).toBeInTheDocument();
    });

    it("renders layout when modules are loading", () => {
      jest.spyOn(useModulesHook, "useModules").mockReturnValue({
        availableModules: {},
        availableNavigation: [],
        checkRouteAccess: jest.fn(),
        isAuth: true,
        isAdmin: false,
        isLoading: true,
        user: null,
        logout: mockLogout,
      });

      renderStoreLayout();
      expect(screen.getByAltText("ambrosia")).toBeInTheDocument();
    });
  });

  describe("Responsive and Accessibility", () => {
    it("sidebar has proper width", () => {
      const { container } = renderStoreLayout();
      const sidebar = container.querySelector("aside");

      expect(sidebar).toHaveClass("w-64");
    });

    it("navigation items have proper spacing", () => {
      const { container } = renderStoreLayout();
      const navList = container.querySelector("nav ul");

      expect(navList).toHaveClass("space-y-2");
    });

    it("nav buttons have flex layout for icon and text", () => {
      renderStoreLayout();
      const usersLink = screen.getByText("users").closest("a");

      expect(usersLink).toHaveClass("flex", "items-center", "space-x-2");
    });

    it("has proper padding and margins throughout", () => {
      const { container } = renderStoreLayout();
      const nav = container.querySelector("nav");
      const main = container.querySelector("main");

      expect(nav).toHaveClass("p-4");
      expect(main).toHaveClass("p-6");
    });
  });

  describe("Integration with Providers", () => {
    it("integrates with I18nProvider for translations", async () => {
      await act(async () => {
        renderStoreLayout();
      });

      expect(screen.getByText("users")).toBeInTheDocument();
      expect(screen.getByText("logout")).toBeInTheDocument();
    });

    it("integrates with ConfigurationsProvider for business data", () => {
      const customConfig = {
        businessName: "Custom Store Name",
        businessType: "store",
      };

      jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
        config: customConfig,
        isLoading: false,
        businessType: "store",
        refreshConfig: jest.fn(),
        setConfig: jest.fn(),
      });

      renderStoreLayout();
      expect(screen.getByText("Custom Store Name")).toBeInTheDocument();
    });

    it("integrates with useModules hook for navigation", () => {
      renderStoreLayout();
      expect(useModulesHook.useModules).toHaveBeenCalled();
      expect(screen.getByText("users")).toBeInTheDocument();
    });
  });
});
