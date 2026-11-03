import { render, screen, fireEvent } from "@testing-library/react";

import { SecretsEncryptionCard } from "../SecretsEncryptionCard";

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
  Input: ({ label, value, onValueChange }) => (
    <div>
      <label htmlFor={label}>{label}</label>
      <input id={label} value={value} onChange={(event) => onValueChange(event.target.value)} />
    </div>
  ),
  Spinner: () => <div data-testid="spinner" />,
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("lucide-react", () => ({
  AlertTriangle: () => <svg data-testid="icon-alert" />,
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

describe("SecretsEncryptionCard", () => {
  describe("Initial (summary) state", () => {
    it("renders the summary card by default", () => {
      render(<SecretsEncryptionCard />);
      expect(screen.getByText("secretsEncryptionCard.manageButton")).toBeInTheDocument();
    });

    it("does not render the WalletGuard before reveal", () => {
      render(<SecretsEncryptionCard />);
      expect(screen.queryByTestId("wallet-guard")).not.toBeInTheDocument();
    });
  });

  describe("Transition to details state", () => {
    it("renders WalletGuard after the manage button is clicked", () => {
      render(<SecretsEncryptionCard />);
      fireEvent.click(screen.getByText("secretsEncryptionCard.manageButton"));
      expect(screen.getByTestId("wallet-guard")).toBeInTheDocument();
    });

    it("hides the summary card after the manage button is clicked", () => {
      render(<SecretsEncryptionCard />);
      fireEvent.click(screen.getByText("secretsEncryptionCard.manageButton"));
      expect(screen.queryByText("secretsEncryptionCard.manageButton")).not.toBeInTheDocument();
    });
  });

  describe("Hide (return to summary state)", () => {
    it("returns to summary state when WalletGuard cancel is pressed", () => {
      render(<SecretsEncryptionCard />);
      fireEvent.click(screen.getByText("secretsEncryptionCard.manageButton"));
      fireEvent.click(screen.getByTestId("guard-cancel"));
      expect(screen.getByText("secretsEncryptionCard.manageButton")).toBeInTheDocument();
    });
  });
});
