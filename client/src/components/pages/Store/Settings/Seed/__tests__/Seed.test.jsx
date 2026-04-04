import { render, screen, fireEvent, act } from "@testing-library/react";

import * as walletService from "@/services/walletService";

import { Seed } from "../Seed";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  CardFooter: ({ children }) => <div>{children}</div>,
  Spinner: () => <div data-testid="spinner" />,
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@components/auth/WalletGuard", () => function MockWalletGuard({ children, onAuthorized, onCancel }) {
  return (
    <div data-testid="wallet-guard">
      <button type="button" data-testid="guard-confirm" onClick={onAuthorized}>confirm</button>
      <button type="button" data-testid="guard-cancel" onClick={onCancel}>cancel</button>
      {children}
    </div>
  );
},
);

jest.mock("lucide-react", () => ({
  AlertTriangle: () => <svg data-testid="icon-alert" />,
  PenLine: () => <svg data-testid="icon-pen" />,
}));

const SEED = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Seed", () => {
  describe("Initial (locked) state", () => {
    it("renders the locked card by default", () => {
      render(<Seed />);
      expect(screen.getByText("cardSeed.revealButton")).toBeInTheDocument();
    });

    it("does not render the WalletGuard before reveal", () => {
      render(<Seed />);
      expect(screen.queryByTestId("wallet-guard")).not.toBeInTheDocument();
    });
  });

  describe("Transition to unlocked state", () => {
    it("renders WalletGuard after the reveal button is clicked", () => {
      render(<Seed />);
      fireEvent.click(screen.getByText("cardSeed.revealButton"));
      expect(screen.getByTestId("wallet-guard")).toBeInTheDocument();
    });

    it("hides the locked card after reveal button is clicked", () => {
      render(<Seed />);
      fireEvent.click(screen.getByText("cardSeed.revealButton"));
      expect(screen.queryByText("cardSeed.revealButton")).not.toBeInTheDocument();
    });
  });

  describe("onAuthorized — successful seed fetch", () => {
    it("calls getSeed when WalletGuard confirms", async () => {
      jest.spyOn(walletService, "getSeed").mockResolvedValue(SEED);
      render(<Seed />);
      fireEvent.click(screen.getByText("cardSeed.revealButton"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      expect(walletService.getSeed).toHaveBeenCalledTimes(1);
    });

    it("renders seed words after a successful getSeed call", async () => {
      jest.spyOn(walletService, "getSeed").mockResolvedValue(SEED);
      render(<Seed />);
      fireEvent.click(screen.getByText("cardSeed.revealButton"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      expect(screen.getAllByText("abandon").length).toBeGreaterThan(0);
    });
  });

  describe("onAuthorized — failed seed fetch", () => {
    it("shows an error toast when getSeed throws", async () => {
      const { addToast } = require("@heroui/react");
      jest.spyOn(walletService, "getSeed").mockRejectedValue(new Error("unauthorized"));
      render(<Seed />);
      fireEvent.click(screen.getByText("cardSeed.revealButton"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger" }),
      );
    });

    it("goes back to locked state when getSeed throws", async () => {
      jest.spyOn(walletService, "getSeed").mockRejectedValue(new Error("unauthorized"));
      render(<Seed />);
      fireEvent.click(screen.getByText("cardSeed.revealButton"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      expect(screen.getByText("cardSeed.revealButton")).toBeInTheDocument();
    });
  });

  describe("Hide (return to locked state)", () => {
    it("returns to locked state when the hide button is pressed", async () => {
      jest.spyOn(walletService, "getSeed").mockResolvedValue(SEED);
      render(<Seed />);
      fireEvent.click(screen.getByText("cardSeed.revealButton"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      fireEvent.click(screen.getByText("cardSeed.hideButton"));
      expect(screen.getByText("cardSeed.revealButton")).toBeInTheDocument();
    });

    it("clears the seed when hide button is pressed", async () => {
      jest.spyOn(walletService, "getSeed").mockResolvedValue(SEED);
      render(<Seed />);
      fireEvent.click(screen.getByText("cardSeed.revealButton"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      fireEvent.click(screen.getByText("cardSeed.hideButton"));
      expect(screen.queryByText("abandon")).not.toBeInTheDocument();
    });

    it("returns to locked state when WalletGuard cancel is pressed", () => {
      render(<Seed />);
      fireEvent.click(screen.getByText("cardSeed.revealButton"));
      fireEvent.click(screen.getByTestId("guard-cancel"));
      expect(screen.getByText("cardSeed.revealButton")).toBeInTheDocument();
    });
  });
});
