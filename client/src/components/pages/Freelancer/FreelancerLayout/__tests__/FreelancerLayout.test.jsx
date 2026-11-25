import { render, screen, waitFor, within } from "@testing-library/react";

import { useSeedTour } from "@/hooks/tour/useSeedTour";
import { getSecretsLockStatus } from "@/services/secretsService";
import * as useNavigationHook from "@hooks/useNavigation";
import * as configurationsProvider from "@providers/configurations/configurationsProvider";

import { FreelancerLayout } from "../FreelancerLayout";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/freelancer/timesheet"),
}));

jest.mock("@/hooks/tour/useSeedTour", () => ({
  useSeedTour: jest.fn(),
}));

jest.mock("@/services/secretsService", () => ({
  SECRETS_UNLOCKED_EVENT: "secrets-unlocked",
  getSecretsLockStatus: jest.fn(),
}));

const freelancerNavigation = [
  { path: "/freelancer/timesheet", label: "timesheet", icon: "calendar-clock", showInNavbar: true, showInBottomNav: true, bottomNavOrder: 1 },
  { path: "/freelancer/clients", label: "clients", icon: "contact", showInNavbar: true },
  { path: "/freelancer/wallet", label: "wallet", icon: "wallet", showInNavbar: true },
];

describe("FreelancerLayout", () => {
  beforeEach(() => {
    jest.spyOn(useNavigationHook, "useNavigation").mockReturnValue({
      availableNavigation: freelancerNavigation,
      isAuth: true,
      logout: jest.fn(),
    });
    jest.spyOn(configurationsProvider, "useConfigurations").mockReturnValue({
      config: { businessName: "Freelance Studio" },
    });
    getSecretsLockStatus.mockResolvedValue({ encryptionActive: false, locked: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the freelancer navigation and the page content inside the shared business layout", () => {
    const { container } = render(
      <FreelancerLayout>
        <div>Timesheet Content</div>
      </FreelancerLayout>,
    );
    const sidebar = within(screen.getByTestId("desktop-sidebar"));

    expect(sidebar.getByText("timesheet")).toBeInTheDocument();
    expect(sidebar.getByText("clients")).toBeInTheDocument();
    expect(container.querySelector("main")).toHaveTextContent("Timesheet Content");
  });

  it("starts the seed tour from the timesheet and points it to the freelancer settings", () => {
    render(
      <FreelancerLayout>
        <div>Timesheet Content</div>
      </FreelancerLayout>,
    );

    expect(useSeedTour).toHaveBeenCalledWith({
      isAuth: true,
      homeRoute: "/freelancer/timesheet",
      settingsRoute: "/freelancer/settings",
    });
  });

  it("shows the locked badge on the wallet nav item when secrets are locked", async () => {
    getSecretsLockStatus.mockResolvedValue({ encryptionActive: true, locked: true });

    render(
      <FreelancerLayout>
        <div>Timesheet Content</div>
      </FreelancerLayout>,
    );

    await waitFor(() => {
      const walletLink = within(screen.getByTestId("desktop-sidebar")).getByText("wallet").closest("a");
      expect(within(walletLink).getByLabelText("lockedBadgeLabel")).toBeInTheDocument();
    });
  });

  it("does not show the locked badge when secrets are unlocked", async () => {
    render(
      <FreelancerLayout>
        <div>Timesheet Content</div>
      </FreelancerLayout>,
    );

    await waitFor(() => expect(getSecretsLockStatus).toHaveBeenCalled());
    expect(screen.queryByLabelText("lockedBadgeLabel")).not.toBeInTheDocument();
  });
});
