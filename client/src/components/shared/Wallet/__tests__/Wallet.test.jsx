import { render, screen } from "@testing-library/react";

import { usePermission } from "@/hooks/usePermission";

import { Wallet } from "../Wallet";

jest.mock("@/hooks/usePermission", () => ({
  usePermission: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@components/auth/WalletGuard", () => function MockWalletGuard({ children }) {
  return <div data-testid="wallet-guard">{children}</div>;
});

jest.mock("../WalletDashboard", () => ({
  WalletDashboard: () => <div data-testid="wallet-dashboard" />,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Wallet", () => {
  it("shows a permission-blocked message instead of WalletGuard when wallet_read is missing", () => {
    usePermission.mockReturnValue(false);

    render(<Wallet />);

    expect(screen.getByText("permissionBlocked.title")).toBeInTheDocument();
    expect(screen.getByText("permissionBlocked.subtitle")).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-guard")).not.toBeInTheDocument();
  });

  it("calls usePermission with wallet_read", () => {
    usePermission.mockReturnValue(true);

    render(<Wallet />);

    expect(usePermission).toHaveBeenCalledWith({ allOf: ["wallet_read"] });
  });

  it("renders WalletGuard and WalletDashboard when wallet_read is granted", () => {
    usePermission.mockReturnValue(true);

    render(<Wallet />);

    expect(screen.getByTestId("wallet-guard")).toBeInTheDocument();
    expect(screen.getByTestId("wallet-dashboard")).toBeInTheDocument();
    expect(screen.queryByText("permissionBlocked.title")).not.toBeInTheDocument();
  });

  it("always renders the page header", () => {
    usePermission.mockReturnValue(false);

    render(<Wallet />);

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("subtitle")).toBeInTheDocument();
  });
});
