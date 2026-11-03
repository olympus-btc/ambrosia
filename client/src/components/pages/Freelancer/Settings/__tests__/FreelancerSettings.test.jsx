import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { usePermission } from "@/hooks/usePermission";
import { useSettingsAvailability } from "@components/shared/Settings/hooks/useSettingsAvailability";
import { useNavigation } from "@hooks/useNavigation";

import { FreelancerSettings } from "../FreelancerSettings";

jest.mock("@hooks/useNavigation", () => ({ useNavigation: jest.fn() }));
jest.mock("@/hooks/usePermission", () => ({ usePermission: jest.fn() }));
jest.mock("@components/shared/Settings/hooks/useSettingsAvailability", () => ({ useSettingsAvailability: jest.fn() }));
jest.mock("@lib/isElectron", () => ({ isElectron: false }));

function mockSettingsCard(componentName) {
  return { [componentName]: (settingsCardProps) => <div data-testid={componentName} data-props={JSON.stringify(settingsCardProps)} /> };
}

jest.mock("@components/shared/Settings/QRUrl", () => mockSettingsCard("QRUrl"));
jest.mock("@components/shared/Settings/Currency", () => mockSettingsCard("Currency"));
jest.mock("@components/shared/Settings/Display", () => mockSettingsCard("Display"));
jest.mock("@components/shared/Settings/ExportData", () => mockSettingsCard("ExportData"));
jest.mock("@components/shared/Settings/ImportData", () => mockSettingsCard("ImportData"));
jest.mock("@components/shared/Settings/InstallPWA", () => mockSettingsCard("InstallPWA"));
jest.mock("@components/shared/Settings/Language", () => mockSettingsCard("Language"));
jest.mock("@components/shared/Settings/Lightning/LightningCard", () => mockSettingsCard("LightningCard"));
jest.mock("@components/shared/Settings/Notifications", () => mockSettingsCard("NotificationPreferencesCard"));
jest.mock("@components/shared/Settings/NwcConnection/NwcConnectionCard", () => mockSettingsCard("NwcConnectionCard"));
jest.mock("@components/shared/Settings/PhoenixdRemote/PhoenixdRemoteCard", () => mockSettingsCard("PhoenixdRemoteCard"));
jest.mock("@components/shared/Settings/SecretsEncryption/SecretsEncryptionCard", () => mockSettingsCard("SecretsEncryptionCard"));
jest.mock("@components/shared/Settings/SecureConnection/SecureConnection", () => mockSettingsCard("SecureConnection"));
jest.mock("@components/shared/Settings/Seed", () => mockSettingsCard("Seed"));
jest.mock("@components/shared/Settings/System/SystemCard", () => mockSettingsCard("SystemCard"));
jest.mock("@components/shared/Settings/Tutorials", () => mockSettingsCard("Tutorials"));
jest.mock("../FreelancerInfo", () => mockSettingsCard("FreelancerInfo"));
jest.mock("../PayoutAccounts", () => mockSettingsCard("PayoutAccounts"));

function mockRole({ isAdmin = false, canReadPayoutAccounts = false } = {}) {
  useNavigation.mockReturnValue({ isAdmin });
  usePermission.mockReturnValue(canReadPayoutAccounts);
}

function renderedTabLabels() {
  return screen.getAllByRole("tab").map((settingsTab) => settingsTab.textContent);
}

function renderedCardProps(componentName) {
  return JSON.parse(screen.getByTestId(componentName).dataset.props);
}

describe("FreelancerSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsAvailability.mockReturnValue({
      secureConnectionAvailable: false,
      installPWAAvailable: false,
      devicesTabAvailable: false,
    });
  });

  it("offers only the business and preferences tabs to a role without extra permissions", () => {
    mockRole();
    render(<FreelancerSettings />);

    expect(renderedTabLabels()).toEqual(["categories.business", "categories.preferences"]);
  });

  it("offers the payout accounts tab to a role that can read payout accounts", () => {
    mockRole({ canReadPayoutAccounts: true });
    render(<FreelancerSettings />);

    expect(renderedTabLabels()).toEqual(["categories.business", "categories.preferences", "categories.payoutAccounts"]);
  });

  it("offers every freelancer tab to an admin and never the store printing tab", () => {
    mockRole({ isAdmin: true, canReadPayoutAccounts: true });
    useSettingsAvailability.mockReturnValue({
      secureConnectionAvailable: true,
      installPWAAvailable: false,
      devicesTabAvailable: true,
    });
    render(<FreelancerSettings />);

    expect(renderedTabLabels()).toEqual([
      "categories.business",
      "categories.preferences",
      "categories.wallet",
      "categories.payoutAccounts",
      "categories.backup",
      "categories.devices",
      "categories.system",
      "categories.help",
    ]);
    expect(renderedTabLabels()).not.toContain("categories.printing");
  });

  it("shows the freelancer info and the currency without price step in the business tab", () => {
    mockRole();
    render(<FreelancerSettings />);

    expect(screen.getByTestId("FreelancerInfo")).toBeInTheDocument();
    expect(renderedCardProps("Currency")).toEqual({});
    expect(screen.getByTestId("QRUrl")).toBeInTheDocument();
  });

  it("shows only the seed tour from the timesheet in the help tab", async () => {
    mockRole({ isAdmin: true });
    render(<FreelancerSettings />);

    await userEvent.click(screen.getByText("categories.help"));

    expect(renderedCardProps("Tutorials")).toEqual({ homeRoute: "/freelancer/timesheet", tours: ["seed"] });
  });

  it("shows the wallet cards in the wallet tab", async () => {
    mockRole({ isAdmin: true });
    render(<FreelancerSettings />);

    await userEvent.click(screen.getByText("categories.wallet"));

    ["Seed", "NwcConnectionCard", "PhoenixdRemoteCard", "SecretsEncryptionCard"].forEach((walletCardName) => {
      expect(screen.getByTestId(walletCardName)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("LightningCard")).not.toBeInTheDocument();
  });

  it("shows the payout accounts card in the payout accounts tab", async () => {
    mockRole({ canReadPayoutAccounts: true });
    render(<FreelancerSettings />);

    await userEvent.click(screen.getByText("categories.payoutAccounts"));

    expect(screen.getByTestId("PayoutAccounts")).toBeInTheDocument();
  });
});
