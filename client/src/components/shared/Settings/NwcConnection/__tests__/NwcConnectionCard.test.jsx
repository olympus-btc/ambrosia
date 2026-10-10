import { render, screen, fireEvent } from "@testing-library/react";

import { NwcConnectionCard } from "../NwcConnectionCard";

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
  Input: ({ label, value, onValueChange, errorMessage }) => (
    <div>
      <label htmlFor="nwc-uri-input">{label}</label>
      <input id="nwc-uri-input" value={value} onChange={(event) => onValueChange(event.target.value)} />
      {errorMessage && <span>{errorMessage}</span>}
    </div>
  ),
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

describe("NwcConnectionCard", () => {
  describe("Initial (locked) state", () => {
    it("renders the locked card by default", () => {
      render(<NwcConnectionCard />);
      expect(screen.getByText("nwcConnection.manageButton")).toBeInTheDocument();
    });

    it("does not render the WalletGuard before reveal", () => {
      render(<NwcConnectionCard />);
      expect(screen.queryByTestId("wallet-guard")).not.toBeInTheDocument();
    });
  });

  describe("Transition to unlocked state", () => {
    it("renders WalletGuard after the manage button is clicked", () => {
      render(<NwcConnectionCard />);
      fireEvent.click(screen.getByText("nwcConnection.manageButton"));
      expect(screen.getByTestId("wallet-guard")).toBeInTheDocument();
    });

    it("hides the locked card after the manage button is clicked", () => {
      render(<NwcConnectionCard />);
      fireEvent.click(screen.getByText("nwcConnection.manageButton"));
      expect(screen.queryByText("nwcConnection.manageButton")).not.toBeInTheDocument();
    });
  });

  describe("Hide (return to locked state)", () => {
    it("returns to locked state when WalletGuard cancel is pressed", () => {
      render(<NwcConnectionCard />);
      fireEvent.click(screen.getByText("nwcConnection.manageButton"));
      fireEvent.click(screen.getByTestId("guard-cancel"));
      expect(screen.getByText("nwcConnection.manageButton")).toBeInTheDocument();
    });
  });
});
