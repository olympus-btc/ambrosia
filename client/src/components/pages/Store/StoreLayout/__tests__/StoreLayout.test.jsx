import { render, screen, fireEvent, within, act, waitFor } from "@testing-library/react";

import { useAdminNotificationsWebsocket } from "@/hooks/useAdminNotificationsWebsocket";
import {
  getAdminNotificationPreferences,
  getAdminNotifications,
} from "@/services/adminNotificationsService";
import * as useNavigationHook from "@hooks/useNavigation";
import { I18nProvider } from "@i18n/I18nProvider";
import * as configurationsProvider from "@providers/configurations/configurationsProvider";

import { StoreLayout } from "../StoreLayout";

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
  Menu: () => <div>Menu Icon</div>,
  X: () => <div>X Icon</div>,
}));

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(() => Promise.resolve({})),
}));

jest.mock("@/services/adminNotificationsService", () => ({
  getAdminNotificationPreferences: jest.fn(),
  getAdminNotifications: jest.fn(),
}));

jest.mock("@/hooks/useAdminNotificationsWebsocket", () => ({
  useAdminNotificationsWebsocket: jest.fn(),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return { ...actual, addToast: jest.fn() };
});

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe("StoreLayout", () => {
  const mockLogout = jest.fn();
  let liveNotificationListener;
  let serviceWorkerMessageListener;
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
      showInBottomNav: true,
    },
    {
      path: "/store/checkout",
      label: "checkout",
      icon: "shopping-cart",
      showInNavbar: true,
      showInBottomNav: true,
    },
    {
      path: "/store/settings",
      label: "settings",
      icon: "settings",
      showInNavbar: true,
    },
  ];

  beforeEach(() => {
    const { usePathname } = require("next/navigation");
    jest.clearAllMocks();
    usePathname.mockReturnValue("/store");
    liveNotificationListener = null;
    serviceWorkerMessageListener = null;
    getAdminNotifications.mockResolvedValue([]);
    getAdminNotificationPreferences.mockResolvedValue([
      { category: "wallet", inAppEnabled: true, pushEnabled: true },
    ]);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        addEventListener: jest.fn((eventName, listener) => {
          if (eventName === "message") serviceWorkerMessageListener = listener;
        }),
        removeEventListener: jest.fn(),
      },
    });
    useAdminNotificationsWebsocket.mockReturnValue({
      connected: true,
      onNotification: (listener) => {
        liveNotificationListener = listener;
        return jest.fn();
      },
    });

    jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
      availableFeatures: {},
      availableNavigation: defaultNavigation,

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
      </I18nProvider>,
    );
  }

  function getDesktopSidebar() {
    return screen.getByTestId("desktop-sidebar");
  }

  describe("Logo and Branding", () => {
    it("renders the Ambrosia logo", () => {
      renderStoreLayout();
      expect(screen.getAllByAltText("ambrosia")[0]).toBeInTheDocument();
    });

    it("displays the business name from config", () => {
      renderStoreLayout();
      expect(screen.getAllByText("Mi Tienda Test")[0]).toBeInTheDocument();
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
      const logoLink = within(getDesktopSidebar()).getByAltText("ambrosia").closest("a");
      expect(logoLink).toHaveAttribute("href", "/");
    });
  });

  describe("Navigation Items", () => {
    it("renders all navigation items when authenticated", () => {
      renderStoreLayout();
      const sidebar = getDesktopSidebar();

      expect(within(sidebar).getByText("users")).toBeInTheDocument();
      expect(within(sidebar).getByText("products")).toBeInTheDocument();
      expect(within(sidebar).getByText("checkout")).toBeInTheDocument();
      expect(within(sidebar).getByText("settings")).toBeInTheDocument();
    });

    it("does not render navigation items when not authenticated", () => {
      jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
        availableFeatures: {},
        availableNavigation: [],

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
      const sidebar = getDesktopSidebar();

      const usersLink = within(sidebar).getByText("users").closest("a");
      const productsLink = within(sidebar).getByText("products").closest("a");
      const checkoutLink = within(sidebar).getByText("checkout").closest("a");
      const settingsLink = within(sidebar).getByText("settings").closest("a");

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

      jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
        availableFeatures: {},
        availableNavigation: customNavigation,

        isAuth: true,
        isAdmin: true,
        isLoading: false,
        user: { userName: "admin" },
        logout: mockLogout,
      });

      renderStoreLayout();
      const sidebar = getDesktopSidebar();

      expect(within(sidebar).getByText("inventory")).toBeInTheDocument();
      expect(within(sidebar).queryByText("users")).not.toBeInTheDocument();
    });

    it("shows unread admin notification count in the notifications navigation item", async () => {
      const notificationsNavigation = [
        ...defaultNavigation,
        {
          path: "/store/notifications",
          label: "notifications",
          icon: "bell",
          showInNavbar: true,
        },
      ];
      getAdminNotifications.mockResolvedValueOnce([
        { id: "notification-1" },
        { id: "notification-2" },
      ]);
      jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
        availableFeatures: {},
        availableNavigation: notificationsNavigation,
        isAuth: true,
        isAdmin: true,
        isLoading: false,
        user: { userName: "admin", isAdmin: true },
        logout: mockLogout,
      });

      renderStoreLayout();

      await waitFor(() => expect(within(getDesktopSidebar()).getByText("2")).toBeInTheDocument());
    });

    it("shows an in-app toast and increments unread count for live admin notifications", async () => {
      const { addToast } = require("@heroui/react");
      const notificationsNavigation = [
        ...defaultNavigation,
        {
          path: "/store/notifications",
          label: "notifications",
          icon: "bell",
          showInNavbar: true,
        },
      ];
      getAdminNotifications.mockResolvedValueOnce([]);
      jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
        availableFeatures: {},
        availableNavigation: notificationsNavigation,
        isAuth: true,
        isAdmin: true,
        isLoading: false,
        user: { userName: "admin", isAdmin: true },
        logout: mockLogout,
      });

      renderStoreLayout();
      await waitFor(() => expect(liveNotificationListener).toBeTruthy());
      await waitFor(() => expect(getAdminNotificationPreferences).toHaveBeenCalled());

      act(() => {
        liveNotificationListener({
          id: "notification-1",
          type: "wallet.payment.sent",
          title: "Wallet payment sent",
          actorUserName: "Seller",
          metadataJson: JSON.stringify({ recipientAmountSats: 10 }),
        });
      });

      expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
        color: "success",
        description: "Seller sent 10 sats from the wallet.",
        title: "Wallet payment sent",
      }));
      expect(within(getDesktopSidebar()).getByText("1")).toBeInTheDocument();
    });

    it("increments unread count without showing a toast when in-app notifications are disabled", async () => {
      const { addToast } = require("@heroui/react");
      const notificationsNavigation = [
        ...defaultNavigation,
        {
          path: "/store/notifications",
          label: "notifications",
          icon: "bell",
          showInNavbar: true,
        },
      ];
      getAdminNotificationPreferences.mockResolvedValueOnce([
        { category: "wallet", inAppEnabled: false, pushEnabled: true },
      ]);
      getAdminNotifications.mockResolvedValueOnce([]);
      jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
        availableFeatures: {},
        availableNavigation: notificationsNavigation,
        isAuth: true,
        isAdmin: true,
        isLoading: false,
        user: { userName: "admin", isAdmin: true },
        logout: mockLogout,
      });

      renderStoreLayout();
      await waitFor(() => expect(liveNotificationListener).toBeTruthy());
      await waitFor(() => expect(getAdminNotificationPreferences).toHaveBeenCalled());

      act(() => {
        liveNotificationListener({
          id: "notification-1",
          category: "wallet",
          type: "wallet.payment.sent",
          title: "Wallet payment sent",
          actorUserName: "Seller",
          metadataJson: JSON.stringify({ recipientAmountSats: 10 }),
        });
      });

      expect(addToast).not.toHaveBeenCalled();
      expect(within(getDesktopSidebar()).getByText("1")).toBeInTheDocument();
    });

    it("refreshes unread count from service worker push messages without showing a toast", async () => {
      const { addToast } = require("@heroui/react");
      const notificationsNavigation = [
        ...defaultNavigation,
        {
          path: "/store/notifications",
          label: "notifications",
          icon: "bell",
          showInNavbar: true,
        },
      ];
      getAdminNotificationPreferences.mockResolvedValueOnce([
        { category: "wallet", inAppEnabled: false, pushEnabled: true },
      ]);
      getAdminNotifications
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "notification-1", category: "wallet" }]);
      jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
        availableFeatures: {},
        availableNavigation: notificationsNavigation,
        isAuth: true,
        isAdmin: true,
        isLoading: false,
        user: { userName: "admin", isAdmin: true },
        logout: mockLogout,
      });

      renderStoreLayout();
      await waitFor(() => expect(serviceWorkerMessageListener).toBeTruthy());
      await waitFor(() => expect(getAdminNotifications).toHaveBeenCalledTimes(1));

      act(() => {
        serviceWorkerMessageListener({
          data: { type: "adminNotifications:refreshUnreadCount" },
        });
      });

      await waitFor(() => expect(within(getDesktopSidebar()).getByText("1")).toBeInTheDocument());
      expect(addToast).not.toHaveBeenCalled();
    });

    it("polls unread notifications and shows a toast when live channel is disconnected", async () => {
      jest.useFakeTimers();
      const { addToast } = require("@heroui/react");
      const notificationsNavigation = [
        ...defaultNavigation,
        {
          path: "/store/notifications",
          label: "notifications",
          icon: "bell",
          showInNavbar: true,
        },
      ];
      getAdminNotifications
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: "notification-1",
            type: "wallet.payment.sent",
            title: "Wallet payment sent",
            actorUserName: "Seller",
            metadataJson: JSON.stringify({ recipientAmountSats: 10 }),
          },
        ]);
      useAdminNotificationsWebsocket.mockReturnValue({
        connected: false,
        onNotification: (listener) => {
          liveNotificationListener = listener;
          return jest.fn();
        },
      });
      jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
        availableFeatures: {},
        availableNavigation: notificationsNavigation,
        isAuth: true,
        isAdmin: true,
        isLoading: false,
        user: { userName: "admin", isAdmin: true },
        logout: mockLogout,
      });

      renderStoreLayout();
      await waitFor(() => expect(getAdminNotifications).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getAdminNotificationPreferences).toHaveBeenCalled());
      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        jest.advanceTimersByTime(10000);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
          description: "Seller sent 10 sats from the wallet.",
          title: "Wallet payment sent",
        }));
      });
      jest.useRealTimers();
    });

    it("does not show an in-app toast when admin is already viewing notifications", async () => {
      const { usePathname } = require("next/navigation");
      const { addToast } = require("@heroui/react");
      usePathname.mockReturnValue("/store/notifications");
      getAdminNotifications.mockResolvedValueOnce([]);
      jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
        availableFeatures: {},
        availableNavigation: defaultNavigation,
        isAuth: true,
        isAdmin: true,
        isLoading: false,
        user: { userName: "admin", isAdmin: true },
        logout: mockLogout,
      });

      renderStoreLayout();
      await waitFor(() => expect(liveNotificationListener).toBeTruthy());
      await waitFor(() => expect(getAdminNotificationPreferences).toHaveBeenCalled());

      act(() => {
        liveNotificationListener({
          id: "notification-1",
          title: "Wallet payment sent",
        });
      });

      expect(addToast).not.toHaveBeenCalled();
    });
  });

  describe("Active Route Highlighting", () => {
    it("highlights the active route based on current pathname", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/users");

      renderStoreLayout();

      const usersLink = within(getDesktopSidebar()).getByText("users").closest("a");
      expect(usersLink).toHaveClass("bg-green-300", "text-green-800");
    });

    it("does not highlight inactive routes", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/users");

      renderStoreLayout();

      const productsLink = within(getDesktopSidebar()).getByText("products").closest("a");
      expect(productsLink).toHaveClass("text-slate-100");
      expect(productsLink).not.toHaveClass("bg-green-300");
    });

    it("highlights routes that start with the same path", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/users/123");

      renderStoreLayout();

      const usersLink = within(getDesktopSidebar()).getByText("users").closest("a");
      expect(usersLink).toHaveClass("bg-green-300", "text-green-800");
    });

    it("applies hover styles to navigation items", () => {
      renderStoreLayout();

      const usersLink = within(getDesktopSidebar()).getByText("users").closest("a");
      expect(usersLink).toHaveClass("hover:bg-green-300", "hover:text-green-800");
    });
  });

  describe("Logout Functionality", () => {
    it("renders logout button", () => {
      renderStoreLayout();
      expect(within(getDesktopSidebar()).getByText("logout")).toBeInTheDocument();
    });

    it("logout button links to /auth", () => {
      renderStoreLayout();
      const logoutLink = within(getDesktopSidebar()).getByText("logout").closest("a");
      expect(logoutLink).toHaveAttribute("href", "/auth");
    });

    it("calls logout function when logout button is clicked", () => {
      renderStoreLayout();
      const logoutButton = within(getDesktopSidebar()).getByText("logout").closest("a");
      fireEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it("renders logout icon", () => {
      renderStoreLayout();
      const logoutButton = within(getDesktopSidebar()).getByText("logout").closest("a");
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe("Layout Structure", () => {
    it("renders desktop sidebar with correct classes", () => {
      renderStoreLayout();
      const sidebar = getDesktopSidebar();

      expect(sidebar).toHaveClass("md:w-48", "lg:w-64", "bg-primary-500", "flex-col");
    });

    it("renders mobile drawer trigger", () => {
      renderStoreLayout();
      expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
    });

    it("renders main content area", () => {
      const { container } = renderStoreLayout();
      const main = container.querySelector("main");

      expect(main).toHaveClass("flex-1", "gradient-fresh");
    });

    it("renders children in main content area", () => {
      renderStoreLayout(<div data-testid="custom-content">Custom Content</div>);

      expect(screen.getByTestId("custom-content")).toBeInTheDocument();
      expect(screen.getByText("Custom Content")).toBeInTheDocument();
    });

    it("positions logout button at bottom of sidebar", () => {
      renderStoreLayout();
      const logoutContainer = within(getDesktopSidebar()).getByText("logout").closest("div");

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
      const desktopSidebar = container.querySelector("[data-testid='desktop-sidebar']");
      const headerSection = desktopSidebar.querySelector(".border-b");
      const footerSection = desktopSidebar.querySelector(".border-t");

      expect(headerSection).toHaveClass("border-green-300");
      expect(footerSection).toHaveClass("border-green-300");
    });
  });

  describe("Mobile Drawer", () => {
    it("renders hamburger button in bottom nav", () => {
      renderStoreLayout();
      expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
    });

    it("drawer is not visible by default", () => {
      renderStoreLayout();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("drawer opens when hamburger is clicked", () => {
      renderStoreLayout();
      fireEvent.click(screen.getByLabelText("Open menu"));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("drawer shows navigation items when open", () => {
      renderStoreLayout();
      fireEvent.click(screen.getByLabelText("Open menu"));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByText("users")).toBeInTheDocument();
      expect(within(dialog).getByText("logout")).toBeInTheDocument();
    });
  });

  describe("Bottom Navigation Bar", () => {
    it("renders bottom nav bar", () => {
      renderStoreLayout();
      expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    });

    it("renders hamburger button with More label", () => {
      renderStoreLayout();
      const bottomNav = screen.getByTestId("bottom-nav");
      expect(within(bottomNav).getByLabelText("Open menu")).toBeInTheDocument();
      expect(within(bottomNav).getByText("menu")).toBeInTheDocument();
    });

    it("renders only items with showInBottomNav as icon shortcuts", () => {
      renderStoreLayout();
      const bottomNav = screen.getByTestId("bottom-nav");
      const links = within(bottomNav).getAllByRole("link");

      expect(links.length).toBe(2);
    });

    it("renders labels for bottom nav shortcuts", () => {
      renderStoreLayout();
      const bottomNav = screen.getByTestId("bottom-nav");

      expect(within(bottomNav).getByText("products")).toBeInTheDocument();
      expect(within(bottomNav).getByText("checkout")).toBeInTheDocument();
    });

    it("highlights active route in bottom nav", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/products");

      renderStoreLayout();
      const bottomNav = screen.getByTestId("bottom-nav");
      const productsLink = within(bottomNav).getAllByRole("link")[0];

      expect(productsLink).toHaveClass("bg-green-300", "text-green-800");
    });

    it("active item label has font-semibold", () => {
      const { usePathname } = require("next/navigation");
      usePathname.mockReturnValue("/store/products");

      renderStoreLayout();
      const bottomNav = screen.getByTestId("bottom-nav");
      const activeLabel = within(bottomNav).getByText("products");

      expect(activeLabel).toHaveClass("font-semibold");
    });

    it("navigates when bottom nav icon is clicked", () => {
      renderStoreLayout();
      const bottomNav = screen.getByTestId("bottom-nav");
      const firstLink = within(bottomNav).getAllByRole("link")[0];

      expect(firstLink).toHaveAttribute("href", "/store/products");
    });
  });

  describe("Icon Component", () => {
    it("renders icon with correct formatting", () => {
      renderStoreLayout();
      expect(within(getDesktopSidebar()).getByText("users")).toBeInTheDocument();
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

      jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
        availableFeatures: {},
        availableNavigation: customNavigation,

        isAuth: true,
        isAdmin: false,
        isLoading: false,
        user: { userName: "testuser" },
        logout: mockLogout,
      });

      renderStoreLayout();
      expect(within(getDesktopSidebar()).getByText("test")).toBeInTheDocument();
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
      expect(screen.getAllByAltText("ambrosia")[0]).toBeInTheDocument();
    });

    it("renders layout when modules are loading", () => {
      jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
        availableFeatures: {},
        availableNavigation: [],

        isAuth: true,
        isAdmin: false,
        isLoading: true,
        user: null,
        logout: mockLogout,
      });

      renderStoreLayout();
      expect(screen.getAllByAltText("ambrosia")[0]).toBeInTheDocument();
    });
  });

  describe("Responsive and Accessibility", () => {
    it("desktop sidebar has correct width classes", () => {
      renderStoreLayout();
      const sidebar = getDesktopSidebar();

      expect(sidebar).toHaveClass("md:w-48", "lg:w-64", "bg-primary-500", "flex-col");
    });

    it("navigation items have proper spacing", () => {
      const { container } = renderStoreLayout();
      const desktopSidebar = container.querySelector("[data-testid='desktop-sidebar']");
      const navList = desktopSidebar.querySelector("nav ul");

      expect(navList).toHaveClass("space-y-2");
    });

    it("nav buttons have flex layout for icon and text", () => {
      renderStoreLayout();
      const usersLink = within(getDesktopSidebar()).getByText("users").closest("a");

      expect(usersLink).toHaveClass("flex", "items-center", "space-x-2");
    });

    it("has proper padding in nav and main", () => {
      const { container } = renderStoreLayout();
      const desktopSidebar = container.querySelector("[data-testid='desktop-sidebar']");
      const nav = desktopSidebar.querySelector("nav");

      expect(nav).toHaveClass("p-4");
    });
  });

  describe("Integration with Providers", () => {
    it("integrates with I18nProvider for translations", async () => {
      await act(async () => {
        renderStoreLayout();
      });

      expect(within(getDesktopSidebar()).getByText("users")).toBeInTheDocument();
      expect(within(getDesktopSidebar()).getByText("logout")).toBeInTheDocument();
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
      expect(screen.getAllByText("Custom Store Name")[0]).toBeInTheDocument();
    });

    it("integrates with useNavigation() hook for navigation", () => {
      renderStoreLayout();
      expect(useNavigationHook.useNavigation).toHaveBeenCalled();
      expect(within(getDesktopSidebar()).getByText("users")).toBeInTheDocument();
    });
  });
});
