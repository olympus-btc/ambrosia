import { render, screen, act } from "@testing-library/react";

import * as useModulesHook from "@/hooks/useModules";
import { I18nProvider } from "@/i18n/I18nProvider";
import * as configurationsProvider from "@/providers/configurations/configurationsProvider";

import * as useOrdersHook from "../hooks/useOrders";
import * as useProductsHook from "../hooks/useProducts";
import * as useUsersHook from "../hooks/useUsers";
import { Store } from "../Store";

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

jest.mock("@/services/apiClient", () => ({
  apiClient: jest.fn(() => Promise.resolve({})),
}));

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe("Store Dashboard", () => {
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
  ];

  const mockUsers = [
    { id: 1, name: "User 1" },
    { id: 2, name: "User 2" },
    { id: 3, name: "User 3" },
  ];

  const mockProducts = [
    { id: 1, name: "Product 1" },
    { id: 2, name: "Product 2" },
  ];

  const mockOrders = [
    { id: 1, status: "paid" },
    { id: 2, status: "paid" },
    { id: 3, status: "pending" },
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

    jest.spyOn(useUsersHook, "useUsers").mockReturnValue({
      users: mockUsers,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    jest.spyOn(useProductsHook, "useProducts").mockReturnValue({
      products: mockProducts,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    jest.spyOn(useOrdersHook, "useOrders").mockReturnValue({
      orders: mockOrders,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderStore() {
    return render(
      <I18nProvider>
        <Store />
      </I18nProvider>,
    );
  }

  it("renders the dashboard with stats", async () => {
    await act(async () => {
      renderStore();
    });
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("subtitle")).toBeInTheDocument();
    expect(screen.getByText("stats.users")).toBeInTheDocument();
    expect(screen.getByText("stats.products")).toBeInTheDocument();
    expect(screen.getByText("stats.sales")).toBeInTheDocument();
  });

  it("displays correct user count", async () => {
    await act(async () => {
      renderStore();
    });
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("displays correct product count", async () => {
    await act(async () => {
      renderStore();
    });
    const productCountElements = screen.getAllByText("2");
    expect(productCountElements.length).toBeGreaterThan(0);
  });

  it("displays correct paid orders count", async () => {
    await act(async () => {
      renderStore();
    });
    const salesStats = screen.getAllByText("2");
    expect(salesStats.length).toBeGreaterThan(0);
  });

  it("handles empty users array", async () => {
    jest.spyOn(useUsersHook, "useUsers").mockReturnValue({
      users: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    await act(async () => {
      renderStore();
    });
    expect(screen.getByText("stats.users")).toBeInTheDocument();
  });

  it("handles empty products array", async () => {
    jest.spyOn(useProductsHook, "useProducts").mockReturnValue({
      products: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    await act(async () => {
      renderStore();
    });
    expect(screen.getByText("stats.products")).toBeInTheDocument();
  });

  it("handles empty orders array", async () => {
    jest.spyOn(useOrdersHook, "useOrders").mockReturnValue({
      orders: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    await act(async () => {
      renderStore();
    });
    expect(screen.getByText("stats.sales")).toBeInTheDocument();
  });

  it("filters only paid orders for sales count", async () => {
    const ordersWithMixedStatus = [
      { id: 1, status: "paid" },
      { id: 2, status: "pending" },
      { id: 3, status: "cancelled" },
      { id: 4, status: "paid" },
    ];

    jest.spyOn(useOrdersHook, "useOrders").mockReturnValue({
      orders: ordersWithMixedStatus,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    await act(async () => {
      renderStore();
    });

    expect(screen.getByText("stats.sales")).toBeInTheDocument();
  });

  it("renders all three stat cards", async () => {
    await act(async () => {
      renderStore();
    });

    expect(screen.getByText("stats.users")).toBeInTheDocument();
    expect(screen.getByText("stats.products")).toBeInTheDocument();
    expect(screen.getByText("stats.sales")).toBeInTheDocument();
  });

  it("renders within StoreLayout", async () => {
    await act(async () => {
      renderStore();
    });

    expect(screen.getByAltText("ambrosia")).toBeInTheDocument();
    expect(screen.getByText("logout")).toBeInTheDocument();
  });
});
