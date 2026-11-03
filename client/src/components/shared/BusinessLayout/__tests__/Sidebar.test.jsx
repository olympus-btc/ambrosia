import { render, screen, fireEvent } from "@testing-library/react";

import { SidebarContent } from "../Sidebar";

jest.mock("lucide-react", () => ({
  Users: () => <div>Users Icon</div>,
  Box: () => <div>Box Icon</div>,
  ShoppingCart: () => <div>ShoppingCart Icon</div>,
  LogOut: () => <div>LogOut Icon</div>,
  FileText: () => <div>FileText Icon</div>,
  Lock: () => <div>Lock Icon</div>,
}));

const mockNavigation = [
  { path: "/store/users", label: "users", icon: "users", showInNavbar: true },
  { path: "/store/products", label: "products", icon: "box", showInNavbar: true },
];

const mockNavbarTranslations = (key) => key;

function renderSidebar(props = {}) {
  const mockLogout = jest.fn();
  const defaults = {
    availableNavigation: mockNavigation,
    isAuth: true,
    pathname: "/store/users",
    navbarTranslations: mockNavbarTranslations,
    logout: mockLogout,
    config: { businessName: "Test Store" },
    logoSrc: null,
    onNavClick: jest.fn(),
  };
  return { mockLogout, ...render(<SidebarContent {...defaults} {...props} />) };
}

describe("SidebarContent", () => {
  it("renders the business name", () => {
    renderSidebar();
    expect(screen.getByText("Test Store")).toBeInTheDocument();
  });

  it("renders the ambrosia logo", () => {
    renderSidebar();
    expect(screen.getByAltText("ambrosia")).toBeInTheDocument();
  });

  it("logo links to homepage", () => {
    renderSidebar();
    expect(screen.getByAltText("ambrosia").closest("a")).toHaveAttribute("href", "/");
  });

  it("renders navigation items when authenticated", () => {
    renderSidebar();
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("products")).toBeInTheDocument();
  });

  it("does not render nav items when not authenticated", () => {
    renderSidebar({ isAuth: false });
    expect(screen.queryByText("users")).not.toBeInTheDocument();
  });

  it("highlights active route", () => {
    renderSidebar({ pathname: "/store/products" });
    const productsLink = screen.getByText("products").closest("a");
    expect(productsLink).toHaveClass("bg-green-300", "text-green-800");
  });

  it("renders logout button linking to /auth", () => {
    renderSidebar();
    const logoutLink = screen.getByText("logout").closest("a");
    expect(logoutLink).toHaveAttribute("href", "/auth");
  });

  it("calls logout and onNavClick when logout is clicked", () => {
    const onNavClick = jest.fn();
    const { mockLogout } = renderSidebar({ onNavClick });
    fireEvent.click(screen.getByText("logout").closest("a"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(onNavClick).toHaveBeenCalledTimes(1);
  });

  it("adds nav-wallet id to wallet item when withTourIds is true", () => {
    const navWithWallet = [
      { path: "/store/wallet", label: "wallet", icon: "users", showInNavbar: true, tourId: "nav-wallet" },
    ];
    renderSidebar({ availableNavigation: navWithWallet, withTourIds: true });
    expect(screen.getByText("wallet").closest("a")).toHaveAttribute("id", "nav-wallet");
  });

  describe("Locked paths", () => {
    const navWithWallet = [
      { path: "/store/wallet", label: "wallet", icon: "users", showInNavbar: true },
      { path: "/store/products", label: "products", icon: "box", showInNavbar: true },
    ];

    it("shows the locked badge on the wallet item when its path is locked", () => {
      renderSidebar({ availableNavigation: navWithWallet, lockedPaths: ["/store/wallet"] });

      expect(screen.getByLabelText("lockedBadgeLabel")).toBeInTheDocument();
    });

    it("does not show the locked badge on other items", () => {
      renderSidebar({ availableNavigation: navWithWallet, lockedPaths: ["/store/wallet"] });

      expect(screen.getByText("products").closest("a")).not.toContainElement(
        screen.queryByLabelText("lockedBadgeLabel"),
      );
    });

    it("does not show the locked badge when no path is locked", () => {
      renderSidebar({ availableNavigation: navWithWallet, lockedPaths: [] });

      expect(screen.queryByLabelText("lockedBadgeLabel")).not.toBeInTheDocument();
    });

    it("calls onLockedClick when the locked badge is clicked", () => {
      const onLockedClick = jest.fn();
      renderSidebar({ availableNavigation: navWithWallet, lockedPaths: ["/store/wallet"], onLockedClick });

      fireEvent.click(screen.getByLabelText("lockedBadgeLabel"));

      expect(onLockedClick).toHaveBeenCalledTimes(1);
    });

    it("puts a red background on the wallet item when its path is locked", () => {
      renderSidebar({ availableNavigation: navWithWallet, lockedPaths: ["/store/wallet"] });

      expect(screen.getByText("wallet").closest("a")).toHaveClass("bg-red-800");
    });

    it("does not put a red background on the wallet item when no path is locked", () => {
      renderSidebar({ availableNavigation: navWithWallet, lockedPaths: [] });

      expect(screen.getByText("wallet").closest("a")).not.toHaveClass("bg-red-800");
    });

    it("calls onLockedClick instead of navigating when clicking anywhere on a locked item", () => {
      const onLockedClick = jest.fn();
      renderSidebar({ availableNavigation: navWithWallet, lockedPaths: ["/store/wallet"], onLockedClick });

      const navigationAllowed = fireEvent.click(screen.getByText("wallet"));

      expect(onLockedClick).toHaveBeenCalledTimes(1);
      expect(navigationAllowed).toBe(false);
    });

    it("navigates normally when clicking anywhere on the item and no path is locked", () => {
      const onLockedClick = jest.fn();
      renderSidebar({ availableNavigation: navWithWallet, lockedPaths: [], onLockedClick });

      const navigationAllowed = fireEvent.click(screen.getByText("wallet"));

      expect(onLockedClick).not.toHaveBeenCalled();
      expect(navigationAllowed).toBe(true);
    });
  });

  describe("Badge counts", () => {
    it("shows the badge count on the item whose path has one", () => {
      renderSidebar({ badgeCountsByPath: { "/store/products": 3 } });

      expect(screen.getByText("products").closest("a")).toHaveTextContent("3");
    });

    it("does not show a badge on items without a count", () => {
      renderSidebar({ badgeCountsByPath: { "/store/products": 3 } });

      expect(screen.getByText("users").closest("a")).not.toHaveTextContent("3");
    });
  });
});
