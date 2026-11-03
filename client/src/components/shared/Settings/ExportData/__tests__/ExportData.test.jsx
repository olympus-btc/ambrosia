import { render, screen, fireEvent, act } from "@testing-library/react";

import * as backupService from "@/services/backupService";
import { MockHeroUIProgress } from "@test-utils/mockHeroUIProgress";

import { ExportData } from "../ExportData";

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
  Progress: MockHeroUIProgress,
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@components/auth/WalletGuard", () => function MockWalletGuard({ children, onAuthorized, onCancel }) {
  return (
    <div data-testid="wallet-guard">
      <button type="button" data-testid="guard-confirm" onClick={() => onAuthorized("wallet-password")}>confirm</button>
      <button type="button" data-testid="guard-cancel" onClick={onCancel}>cancel</button>
      {children}
    </div>
  );
},
);

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("ExportData", () => {
  describe("Initial (locked) state", () => {
    it("renders the locked card by default", () => {
      render(<ExportData />);
      expect(screen.getByText("cardExportData.exportButton")).toBeInTheDocument();
    });

    it("does not render the WalletGuard before reveal", () => {
      render(<ExportData />);
      expect(screen.queryByTestId("wallet-guard")).not.toBeInTheDocument();
    });
  });

  describe("Transition to unlocked state", () => {
    it("renders WalletGuard after the export button is clicked", () => {
      render(<ExportData />);
      fireEvent.click(screen.getByText("cardExportData.exportButton"));
      expect(screen.getByTestId("wallet-guard")).toBeInTheDocument();
    });
  });

  describe("onAuthorized — successful export", () => {
    it("calls exportBackup with the entered password", async () => {
      jest.spyOn(backupService, "exportBackup").mockResolvedValue(undefined);
      render(<ExportData />);
      fireEvent.click(screen.getByText("cardExportData.exportButton"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      expect(backupService.exportBackup).toHaveBeenCalledWith("wallet-password", expect.any(Function));
    });

    it("threads progress reported by exportBackup into the rendered card", async () => {
      let reportProgress;
      jest.spyOn(backupService, "exportBackup").mockImplementation((password, onProgress) => {
        reportProgress = onProgress;
        return new Promise(() => {});
      });
      render(<ExportData />);
      fireEvent.click(screen.getByText("cardExportData.exportButton"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });
      act(() => {
        reportProgress({ phase: "writing", percent: 55 });
      });

      expect(screen.getByTestId("progress")).toHaveAttribute("data-value", "55");
    });

    it("shows a success toast", async () => {
      const { addToast } = require("@heroui/react");
      jest.spyOn(backupService, "exportBackup").mockResolvedValue(undefined);
      render(<ExportData />);
      fireEvent.click(screen.getByText("cardExportData.exportButton"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "success", description: "cardExportData.success" }),
      );
    });

    it("returns to locked state after a successful export", async () => {
      jest.spyOn(backupService, "exportBackup").mockResolvedValue(undefined);
      render(<ExportData />);
      fireEvent.click(screen.getByText("cardExportData.exportButton"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      expect(screen.getByText("cardExportData.exportButton")).toBeInTheDocument();
    });
  });

  describe("onAuthorized — failed export", () => {
    it("shows an error toast when exportBackup throws", async () => {
      const { addToast } = require("@heroui/react");
      jest.spyOn(backupService, "exportBackup").mockRejectedValue(new Error("Wrong password"));
      render(<ExportData />);
      fireEvent.click(screen.getByText("cardExportData.exportButton"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "cardExportData.errorDescription" }),
      );
    });

    it("returns to locked state when exportBackup throws", async () => {
      jest.spyOn(backupService, "exportBackup").mockRejectedValue(new Error("Wrong password"));
      render(<ExportData />);
      fireEvent.click(screen.getByText("cardExportData.exportButton"));

      await act(async () => {
        fireEvent.click(screen.getByTestId("guard-confirm"));
      });

      expect(screen.getByText("cardExportData.exportButton")).toBeInTheDocument();
    });
  });

  describe("Cancel", () => {
    it("returns to locked state when WalletGuard cancel is pressed", () => {
      render(<ExportData />);
      fireEvent.click(screen.getByText("cardExportData.exportButton"));
      fireEvent.click(screen.getByTestId("guard-cancel"));
      expect(screen.getByText("cardExportData.exportButton")).toBeInTheDocument();
    });
  });
});
