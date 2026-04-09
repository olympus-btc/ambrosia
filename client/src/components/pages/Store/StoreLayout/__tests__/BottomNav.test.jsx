import { render, screen, fireEvent, within } from "@testing-library/react";

import { BottomNav } from "../BottomNav";

jest.mock("lucide-react", () => ({
  Menu: () => <div>Menu Icon</div>,
  ShoppingCart: () => <div>ShoppingCart Icon</div>,
  Box: () => <div>Box Icon</div>,
  ClipboardClock: () => <div>ClipboardClock Icon</div>,
  FileText: () => <div>FileText Icon</div>,
}));

const mockItems = [
  { path: "/store/cart", label: "cart", icon: "shopping-cart", showInBottomNav: true, bottomNavOrder: 1 },
  { path: "/store/products", label: "products", icon: "box", showInBottomNav: true, bottomNavOrder: 2 },
];

const mockT = (key) => key;

function renderBottomNav(props = {}) {
  const defaults = {
    isAuth: true,
    items: mockItems,
    pathname: "/store",
    t: mockT,
    onMenuClick: jest.fn(),
  };
  return render(<BottomNav {...defaults} {...props} />);
}

describe("BottomNav", () => {
  it("renders the bottom nav", () => {
    renderBottomNav();
    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
  });

  it("renders hamburger button with More label", () => {
    renderBottomNav();
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
    expect(screen.getByText("menu")).toBeInTheDocument();
  });

  it("calls onMenuClick when hamburger is pressed", () => {
    const onMenuClick = jest.fn();
    renderBottomNav({ onMenuClick });
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  it("renders nav item links when authenticated", () => {
    renderBottomNav();
    const links = within(screen.getByTestId("bottom-nav")).getAllByRole("link");
    expect(links).toHaveLength(2);
  });

  it("does not render nav links when not authenticated", () => {
    renderBottomNav({ isAuth: false });
    expect(within(screen.getByTestId("bottom-nav")).queryAllByRole("link")).toHaveLength(0);
  });

  it("renders labels for each item", () => {
    renderBottomNav();
    expect(screen.getByText("cart")).toBeInTheDocument();
    expect(screen.getByText("products")).toBeInTheDocument();
  });

  it("highlights active item with bg-green-300", () => {
    renderBottomNav({ pathname: "/store/cart" });
    const links = within(screen.getByTestId("bottom-nav")).getAllByRole("link");
    expect(links[0]).toHaveClass("bg-green-300", "text-green-800");
  });

  it("active label has font-semibold", () => {
    renderBottomNav({ pathname: "/store/products" });
    expect(screen.getByText("products")).toHaveClass("font-semibold");
  });

  it("inactive items do not have active classes", () => {
    renderBottomNav({ pathname: "/store/cart" });
    const links = within(screen.getByTestId("bottom-nav")).getAllByRole("link");
    expect(links[1]).not.toHaveClass("bg-green-300");
    expect(links[1]).toHaveClass("text-slate-100");
  });

  it("links point to correct paths", () => {
    renderBottomNav();
    const links = within(screen.getByTestId("bottom-nav")).getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/store/cart");
    expect(links[1]).toHaveAttribute("href", "/store/products");
  });
});
