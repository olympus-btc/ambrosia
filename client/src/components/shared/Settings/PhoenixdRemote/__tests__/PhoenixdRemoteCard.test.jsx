import { render, screen, fireEvent } from "@testing-library/react";

import { PhoenixdRemoteCard } from "../PhoenixdRemoteCard";

jest.mock("@/hooks/usePermission");

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  CardFooter: ({ children }) => <div>{children}</div>,
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@components/auth/WalletGuard", () => function MockWalletGuard({ children, onCancel }) {
  return (
    <div data-testid="wallet-guard">
      <button type="button" data-testid="guard-cancel" onClick={onCancel}>cancel</button>
      {children}
    </div>
  );
},
);

jest.mock("@components/shared/PhoenixdRemoteFields", () => ({
  PhoenixdRemoteFields: () => <div data-testid="phoenixd-remote-fields" />,
}));

jest.mock("@components/shared/RestartRequiredModal", () => ({
  RestartRequiredModal: () => null,
}));

jest.mock("../PhoenixdRemoteActivatedModal", () => ({
  PhoenixdRemoteActivatedModal: () => null,
}));

describe("PhoenixdRemoteCard", () => {
  describe("Initial (locked) state", () => {
    it("renders the locked card by default", () => {
      render(<PhoenixdRemoteCard />);
      expect(screen.getByText("phoenixdRemoteCard.manageButton")).toBeInTheDocument();
    });

    it("does not render the WalletGuard before reveal", () => {
      render(<PhoenixdRemoteCard />);
      expect(screen.queryByTestId("wallet-guard")).not.toBeInTheDocument();
    });
  });

  describe("Transition to unlocked state", () => {
    it("renders WalletGuard after the manage button is clicked", () => {
      render(<PhoenixdRemoteCard />);
      fireEvent.click(screen.getByText("phoenixdRemoteCard.manageButton"));
      expect(screen.getByTestId("wallet-guard")).toBeInTheDocument();
    });

    it("hides the locked card after the manage button is clicked", () => {
      render(<PhoenixdRemoteCard />);
      fireEvent.click(screen.getByText("phoenixdRemoteCard.manageButton"));
      expect(screen.queryByText("phoenixdRemoteCard.manageButton")).not.toBeInTheDocument();
    });
  });

  describe("Hide (return to locked state)", () => {
    it("returns to locked state when WalletGuard cancel is pressed", () => {
      render(<PhoenixdRemoteCard />);
      fireEvent.click(screen.getByText("phoenixdRemoteCard.manageButton"));
      fireEvent.click(screen.getByTestId("guard-cancel"));
      expect(screen.getByText("phoenixdRemoteCard.manageButton")).toBeInTheDocument();
    });
  });
});
