import { render, screen, fireEvent, act } from "@testing-library/react";

import * as backupService from "@/services/backupService";
import { restartAppAfterImport } from "@/utils/restartAppAfterImport";
import { MockHeroUIProgress } from "@test-utils/mockHeroUIProgress";

import { ImportData } from "../ImportData";

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
  Modal: ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null),
  ModalContent: ({ children }) => <div>{children}</div>,
  ModalHeader: ({ children }) => <div>{children}</div>,
  ModalBody: ({ children }) => <div>{children}</div>,
  ModalFooter: ({ children }) => <div>{children}</div>,
}));

jest.mock("@components/shared/BackupPasswordAndFileFields", () => ({
  BackupPasswordAndFileFields: ({ onBackupPasswordChange, onFileChange }) => (
    <div>
      <button type="button" data-testid="fill-backup-password" onClick={() => onBackupPasswordChange("backup-password")}>fill-backup-password</button>
      <button
        type="button"
        data-testid="select-backup-file"
        onClick={() => onFileChange(new File(["zip-content"], "backup.zip", { type: "application/zip" }))}
      >
        select-backup-file
      </button>
    </div>
  ),
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

jest.mock("@/utils/restartAppAfterImport");

jest.mock("@components/shared/RestartRequiredModal", () => ({
  RestartRequiredModal: ({ isOpen, onManualClose, onRestart }) => (
    isOpen ? (
      <div data-testid="restart-modal">
        <button type="button" data-testid="restart-modal-manual-close" onClick={onManualClose}>manual-close</button>
        <button type="button" data-testid="restart-modal-restart" onClick={onRestart}>restart</button>
      </div>
    ) : null
  ),
}));

async function unlockSelectFileAndImport() {
  fireEvent.click(screen.getByText("cardImportData.importButton"));
  fireEvent.click(screen.getByTestId("guard-confirm"));
  fireEvent.click(screen.getByTestId("select-backup-file"));
  fireEvent.click(screen.getByTestId("fill-backup-password"));
  fireEvent.click(screen.getByText("cardImportData.continueButton"));

  await act(async () => {
    fireEvent.click(screen.getByText("cardImportData.confirmModal.confirmButton"));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(backupService, "confirmPendingImport").mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("ImportData", () => {
  describe("Initial (locked) state", () => {
    it("renders the locked card by default", () => {
      render(<ImportData />);
      expect(screen.getByText("cardImportData.importButton")).toBeInTheDocument();
    });

    it("does not render the WalletGuard before reveal", () => {
      render(<ImportData />);
      expect(screen.queryByTestId("wallet-guard")).not.toBeInTheDocument();
    });
  });

  describe("Transition to unlocked state", () => {
    it("renders WalletGuard after the import button is clicked", () => {
      render(<ImportData />);
      fireEvent.click(screen.getByText("cardImportData.importButton"));
      expect(screen.getByTestId("wallet-guard")).toBeInTheDocument();
    });
  });

  describe("Successful import", () => {
    it("calls importBackup with the wallet password, backup password, and the selected file", async () => {
      jest.spyOn(backupService, "importBackup").mockResolvedValue({ businessName: "Awesome Store" });
      render(<ImportData />);

      await unlockSelectFileAndImport();

      expect(backupService.importBackup).toHaveBeenCalledWith(
        "wallet-password",
        "backup-password",
        expect.any(File),
        expect.any(Function),
      );
    });

    it("threads progress reported by importBackup into the rendered card", async () => {
      let reportProgress;
      jest.spyOn(backupService, "importBackup").mockImplementation((rolePassword, backupPassword, backupFile, onProgress) => {
        reportProgress = onProgress;
        return new Promise(() => {});
      });
      render(<ImportData />);

      await unlockSelectFileAndImport();
      act(() => {
        reportProgress({ phase: "uploading", percent: 63 });
      });

      expect(screen.getByTestId("progress")).toHaveAttribute("data-value", "63");
    });

    it("shows a success toast", async () => {
      const { addToast } = require("@heroui/react");
      jest.spyOn(backupService, "importBackup").mockResolvedValue({ businessName: "Awesome Store" });
      render(<ImportData />);

      await unlockSelectFileAndImport();

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "success", description: "cardImportData.success" }),
      );
    });

    it("confirms the pending import before showing the restart modal", async () => {
      const callOrder = [];
      jest.spyOn(backupService, "importBackup").mockResolvedValue({ businessName: "Awesome Store" });
      backupService.confirmPendingImport.mockImplementation(async () => {
        callOrder.push("confirm");
      });
      render(<ImportData />);

      await unlockSelectFileAndImport();
      callOrder.push(screen.getByTestId("restart-modal") ? "modal" : "no-modal");

      expect(callOrder).toEqual(["confirm", "modal"]);
    });

    it("passes restartAppAfterImport as onRestart to the restart modal", async () => {
      jest.spyOn(backupService, "importBackup").mockResolvedValue({ businessName: "Awesome Store" });
      render(<ImportData />);

      await unlockSelectFileAndImport();
      fireEvent.click(screen.getByTestId("restart-modal-restart"));

      expect(restartAppAfterImport).toHaveBeenCalledTimes(1);
    });

    it("closes the restart modal without a relaunch when manually closed", async () => {
      jest.spyOn(backupService, "importBackup").mockResolvedValue({ businessName: "Awesome Store" });
      render(<ImportData />);

      await unlockSelectFileAndImport();
      fireEvent.click(screen.getByTestId("restart-modal-manual-close"));

      expect(restartAppAfterImport).not.toHaveBeenCalled();
      expect(screen.queryByTestId("restart-modal")).not.toBeInTheDocument();
    });
  });

  describe("Failed import", () => {
    it("shows an error inside the card when importBackup throws", async () => {
      jest.spyOn(backupService, "importBackup").mockRejectedValue(new Error("Invalid backup file"));
      render(<ImportData />);

      await unlockSelectFileAndImport();

      expect(await screen.findByText("cardImportData.errorDescription")).toBeInTheDocument();
    });

    it("does not show the restart modal when importBackup throws", async () => {
      jest.spyOn(backupService, "importBackup").mockRejectedValue(new Error("Invalid backup file"));
      render(<ImportData />);

      await unlockSelectFileAndImport();

      expect(screen.queryByTestId("restart-modal")).not.toBeInTheDocument();
    });
  });

  describe("Cancel", () => {
    it("returns to locked state when WalletGuard cancel is pressed", () => {
      render(<ImportData />);
      fireEvent.click(screen.getByText("cardImportData.importButton"));
      fireEvent.click(screen.getByTestId("guard-cancel"));
      expect(screen.getByText("cardImportData.importButton")).toBeInTheDocument();
    });
  });
});
