import { render, screen, within } from "@testing-library/react";

import * as useNavigationHook from "@hooks/useNavigation";
import * as configurationsProvider from "@providers/configurations/configurationsProvider";

import { BusinessLayout } from "../BusinessLayout";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/freelancer/timesheet"),
}));

jest.mock("lucide-react", () => ({
  CalendarClock: () => <div>CalendarClock Icon</div>,
  FolderKanban: () => <div>FolderKanban Icon</div>,
  FileText: () => <div>FileText Icon</div>,
  LogOut: () => <div>LogOut Icon</div>,
  Menu: () => <div>Menu Icon</div>,
  Lock: () => <div>Lock Icon</div>,
}));

const navigation = [
  { path: "/freelancer/invoices", label: "invoices", icon: "file-text", showInNavbar: true, showInBottomNav: true, bottomNavOrder: 2 },
  { path: "/freelancer/timesheet", label: "timesheet", icon: "calendar-clock", showInNavbar: true, showInBottomNav: true, bottomNavOrder: 1 },
  { path: "/freelancer/projects", label: "projects", icon: "folder-kanban", showInNavbar: true },
];

const navbarTranslations = (key) => `t:${key}`;

function renderBusinessLayout(props = {}) {
  return render(
    <BusinessLayout navbarTranslations={navbarTranslations} {...props}>
      <div>Page Content</div>
    </BusinessLayout>,
  );
}

describe("BusinessLayout", () => {
  beforeEach(() => {
    jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
      availableNavigation: navigation,
      isAuth: true,
      logout: jest.fn(),
    });
    jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
      config: { businessName: "Freelance Studio" },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders its children inside main", () => {
    const { container } = renderBusinessLayout();

    expect(container.querySelector("main")).toHaveTextContent("Page Content");
  });

  it("renders every available navigation item in the desktop sidebar with translated labels", () => {
    renderBusinessLayout();
    const sidebar = within(screen.getByTestId("desktop-sidebar"));

    expect(sidebar.getByText("t:timesheet")).toBeInTheDocument();
    expect(sidebar.getByText("t:invoices")).toBeInTheDocument();
    expect(sidebar.getByText("t:projects")).toBeInTheDocument();
  });

  it("renders only bottom nav items, sorted by bottomNavOrder", () => {
    renderBusinessLayout();
    const links = within(screen.getByTestId("bottom-nav")).getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/freelancer/timesheet",
      "/freelancer/invoices",
    ]);
  });

  it("passes badge counts and locked paths down to the sidebar", () => {
    renderBusinessLayout({
      badgeCountsByPath: { "/freelancer/invoices": 4 },
      lockedPaths: ["/freelancer/projects"],
    });
    const sidebar = within(screen.getByTestId("desktop-sidebar"));

    expect(sidebar.getByText("t:invoices").closest("a")).toHaveTextContent("4");
    expect(sidebar.getByText("t:projects").closest("a")).toContainElement(sidebar.getByLabelText("lockedBadgeLabel"));
  });
});
