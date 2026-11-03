import { render, screen, fireEvent, act } from "@testing-library/react";

import { restartAppAfterImport } from "@/utils/restartAppAfterImport";
import { confirmPendingRestore, restoreFromBackup } from "@services/initialSetupService";
import { selectBackupFile } from "@test-utils/selectBackupFile";

import { RestoreFromBackupStep } from "../RestoreFromBackup";

jest.mock("@services/initialSetupService", () => ({
  restoreFromBackup: jest.fn(),
  confirmPendingRestore: jest.fn(),
}));

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

const mockAddToast = jest.fn();
jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return {
    ...actual,
    addToast: (...args) => mockAddToast(...args),
  };
});

function renderStep(onBack = jest.fn()) {
  return render(<RestoreFromBackupStep onBack={onBack} />);
}

describe("RestoreFromBackupStep", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    confirmPendingRestore.mockResolvedValue(undefined);
  });

  it("renders the password and file fields", async () => {
    await act(async () => {
      renderStep();
    });

    expect(screen.getByLabelText("hide-show-backup-password")).toBeInTheDocument();
    expect(screen.getByText("fileLabel")).toBeInTheDocument();
  });

  it("calls onBack when the back button is pressed", async () => {
    const onBack = jest.fn();
    await act(async () => {
      renderStep(onBack);
    });

    fireEvent.click(screen.getByText("buttons.back"));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows a missing-fields error when submitting without a password or file", async () => {
    await act(async () => {
      renderStep();
    });

    fireEvent.click(screen.getByText("restore.submitButton"));

    expect(await screen.findByText("restore.missingFields")).toBeInTheDocument();
    expect(restoreFromBackup).not.toHaveBeenCalled();
  });

  it("shows a generic error when the server rejects the backup", async () => {
    restoreFromBackup.mockResolvedValue({ ok: false });

    await act(async () => {
      renderStep();
    });

    fireEvent.change(screen.getByLabelText("hide-show-backup-password"), { target: { value: "secret" } });
    selectBackupFile();

    await act(async () => {
      fireEvent.click(screen.getByText("restore.submitButton"));
    });

    expect(await screen.findByText("restore.genericError")).toBeInTheDocument();
  });

  it("shows the pending-restore error when the server responds with 409", async () => {
    restoreFromBackup.mockResolvedValue({ ok: false, status: 409, message: "A previous import is already staged" });

    await act(async () => {
      renderStep();
    });

    fireEvent.change(screen.getByLabelText("hide-show-backup-password"), { target: { value: "secret" } });
    selectBackupFile();

    await act(async () => {
      fireEvent.click(screen.getByText("restore.submitButton"));
    });

    expect(await screen.findByText("restore.pendingRestoreError")).toBeInTheDocument();
  });

  it("shows a generic error when the request throws", async () => {
    restoreFromBackup.mockRejectedValue(new Error("network error"));

    await act(async () => {
      renderStep();
    });

    fireEvent.change(screen.getByLabelText("hide-show-backup-password"), { target: { value: "secret" } });
    selectBackupFile();

    await act(async () => {
      fireEvent.click(screen.getByText("restore.submitButton"));
    });

    expect(await screen.findByText("restore.genericError")).toBeInTheDocument();
  });

  it("shows a progress bar once restoreFromBackup reports an uploading phase update", async () => {
    let reportProgress;
    restoreFromBackup.mockImplementation((password, backupFile, onProgress) => {
      reportProgress = onProgress;
      return new Promise(() => {});
    });

    await act(async () => {
      renderStep();
    });

    fireEvent.change(screen.getByLabelText("hide-show-backup-password"), { target: { value: "secret" } });
    selectBackupFile();
    fireEvent.click(screen.getByText("restore.submitButton"));

    await act(async () => {
      reportProgress({ phase: "uploading", percent: 37 });
    });

    expect(screen.getByText("restore.phaseUploading 37%")).toBeInTheDocument();
  });

  it("shows the extracting phase and its own percent once the server reports it", async () => {
    let reportProgress;
    restoreFromBackup.mockImplementation((password, backupFile, onProgress) => {
      reportProgress = onProgress;
      return new Promise(() => {});
    });

    await act(async () => {
      renderStep();
    });

    fireEvent.change(screen.getByLabelText("hide-show-backup-password"), { target: { value: "secret" } });
    selectBackupFile();
    fireEvent.click(screen.getByText("restore.submitButton"));

    await act(async () => {
      reportProgress({ phase: "extracting", percent: 80 });
    });

    expect(screen.getByText("restore.phaseExtracting 80%")).toBeInTheDocument();
  });

  it("confirms the pending restore before showing the restart modal", async () => {
    const callOrder = [];
    confirmPendingRestore.mockImplementation(async () => {
      callOrder.push("confirm");
    });
    restoreFromBackup.mockResolvedValue({ ok: true });

    await act(async () => {
      renderStep();
    });

    fireEvent.change(screen.getByLabelText("hide-show-backup-password"), { target: { value: "secret" } });
    selectBackupFile();

    await act(async () => {
      fireEvent.click(screen.getByText("restore.submitButton"));
    });
    callOrder.push(screen.getByTestId("restart-modal") ? "modal" : "no-modal");

    expect(callOrder).toEqual(["confirm", "modal"]);
  });

  it("passes restartAppAfterImport as onRestart to the restart modal", async () => {
    restoreFromBackup.mockResolvedValue({ ok: true });

    await act(async () => {
      renderStep();
    });

    fireEvent.change(screen.getByLabelText("hide-show-backup-password"), { target: { value: "secret" } });
    selectBackupFile();

    await act(async () => {
      fireEvent.click(screen.getByText("restore.submitButton"));
    });
    fireEvent.click(screen.getByTestId("restart-modal-restart"));

    expect(restartAppAfterImport).toHaveBeenCalledTimes(1);
  });

  it("closes the restart modal without a relaunch when manually closed", async () => {
    restoreFromBackup.mockResolvedValue({ ok: true });

    await act(async () => {
      renderStep();
    });

    fireEvent.change(screen.getByLabelText("hide-show-backup-password"), { target: { value: "secret" } });
    selectBackupFile();

    await act(async () => {
      fireEvent.click(screen.getByText("restore.submitButton"));
    });
    fireEvent.click(screen.getByTestId("restart-modal-manual-close"));

    expect(restartAppAfterImport).not.toHaveBeenCalled();
    expect(screen.queryByTestId("restart-modal")).not.toBeInTheDocument();
  });
});
