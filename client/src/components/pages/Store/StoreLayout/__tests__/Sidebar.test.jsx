import { render, screen, fireEvent } from "@testing-library/react";

import { SidebarContent } from "../Sidebar";

jest.mock("lucide-react", () => ({
  Users: () => <div>Users Icon</div>,
  Box: () => <div>Box Icon</div>,
  ShoppingCart: () => <div>ShoppingCart Icon</div>,
  LogOut: () => <div>LogOut Icon</div>,
  FileText: () => <div>FileText Icon</div>,
}));

const mockNavigation = [
  { path: "/store/users", label: "users", icon: "users", showInNavbar: true },
  { path: "/store/products", label: "products", icon: "box", showInNavbar: true },
];

const mockT = (key) => key;

function renderSidebar(props = {}) {
  const mockLogout = jest.fn();
  const defaults = {
    availableNavigation: mockNavigation,
    isAuth: true,
    pathname: "/store/users",
    t: mockT,
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
      { path: "/store/wallet", label: "wallet", icon: "users", showInNavbar: true },
    ];
    renderSidebar({ availableNavigation: navWithWallet, withTourIds: true });
    expect(screen.getByText("wallet").closest("a")).toHaveAttribute("id", "nav-wallet");
  });
});
