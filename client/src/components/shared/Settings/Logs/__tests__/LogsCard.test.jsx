import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { getLogHistory, getLogSettings, getLogSources, updateLogSettings } from "@/services/logsService";
import { downloadBlob } from "@/utils/downloadBlob";

import * as useLiveLogStreamHook from "../hooks/useLiveLogStream";
import * as useLogsArchiveDownloadHook from "../hooks/useLogsArchiveDownload";
import { LogsCard } from "../LogsCard";

jest.mock("@/services/logsService", () => ({
  getLogSources: jest.fn(),
  getLogHistory: jest.fn(),
  getLogSettings: jest.fn(),
  updateLogSettings: jest.fn(),
}));
jest.mock("@/utils/downloadBlob", () => ({
  downloadBlob: jest.fn(),
}));
jest.mock("../hooks/useLiveLogStream");
jest.mock("../hooks/useLogsArchiveDownload");

jest.mock("@heroui/react", () => {
  const { Children } = jest.requireActual("react");
  return {
    addToast: jest.fn(),
    Button: ({ onPress, children, isLoading, isDisabled }) => (
      <button type="button" disabled={isLoading || isDisabled} onClick={onPress}>{children}</button>
    ),
    Card: ({ children }) => <div>{children}</div>,
    CardHeader: ({ children }) => <div>{children}</div>,
    CardBody: ({ children }) => <div>{children}</div>,
    Chip: ({ children }) => <span>{children}</span>,
    Input: ({ label, value, onValueChange }) => (
      <input aria-label={label} value={value} onChange={(inputChangeEvent) => onValueChange(inputChangeEvent.target.value)} />
    ),
    Modal: ({ isOpen, onClose, children }) => (isOpen ? (
      <div role="dialog">
        <button type="button" onClick={onClose}>close-modal</button>
        {children}
      </div>
    ) : null),
    ModalContent: ({ children }) => <div>{children}</div>,
    ModalHeader: ({ children }) => <div>{children}</div>,
    ModalBody: ({ children }) => <div>{children}</div>,
    Select: ({ label, description, selectedKeys, onChange, children, isDisabled }) => (
      <>
        <select aria-label={label} value={selectedKeys?.[0] ?? ""} onChange={onChange} disabled={isDisabled}>
          <option value="" />
          {Children.map(children, (selectItemElement) => (
            <option value={selectItemElement.key}>
              {selectItemElement.props.textValue ?? selectItemElement.props.children}
            </option>
          ))}
        </select>
        {description && <p>{description}</p>}
      </>
    ),
    SelectItem: ({ children }) => children,
    Spinner: () => <span>spinner</span>,
    Switch: ({ isSelected, onValueChange, children, isDisabled }) => (
      <label>
        <input
          type="checkbox"
          checked={isSelected}
          disabled={isDisabled}
          onChange={(switchChangeEvent) => onValueChange(switchChangeEvent.target.checked)}
        />
        {children}
      </label>
    ),
  };
});

const serverLogEntry = {
  timestamp: "2026-11-19T10:00:00.000-06:00",
  level: "INFO",
  source: "server",
  logger: "Server",
  message: "Server started",
};

const logSourcesResponseBody = {
  sources: [
    { id: "server", available: true },
    { id: "phoenixd", available: false, unavailableReason: "remote_lightning_backend" },
    { id: "client", available: true },
  ],
};

const savedLogSettings = {
  level: "INFO",
  retentionDays: 7,
  maximumTotalSizeMegabytes: 20,
  clientErrorReportingEnabled: true,
};

let latestLiveLogStreamOptions;
let downloadLogsArchive;

function mockLogsApi() {
  getLogSources.mockResolvedValue(logSourcesResponseBody.sources);
  getLogHistory.mockResolvedValue([serverLogEntry]);
  getLogSettings.mockResolvedValue(savedLogSettings);
  updateLogSettings.mockImplementation(async (requestedLogSettings) => requestedLogSettings);
}

function readBlobAsText(blob) {
  return new Promise((resolve, reject) => {
    const blobReader = new FileReader();
    blobReader.onload = () => resolve(blobReader.result);
    blobReader.onerror = () => reject(blobReader.error);
    blobReader.readAsText(blob);
  });
}

async function renderLogsCardWithLoadedSettings() {
  render(<LogsCard />);
  await waitFor(() => expect(screen.getByLabelText("cardLogs.serverLogLevelLabel")).not.toBeDisabled());
}

async function openLogsViewerModal() {
  await renderLogsCardWithLoadedSettings();
  await act(async () => {
    fireEvent.click(screen.getByText("cardLogs.openViewerButton"));
  });
  await waitFor(() => expect(screen.getByText("Server started")).toBeInTheDocument());
}

describe("LogsCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestLiveLogStreamOptions = undefined;
    downloadLogsArchive = jest.fn().mockResolvedValue(true);
    mockLogsApi();
    jest.spyOn(useLiveLogStreamHook, "useLiveLogStream").mockImplementation((liveLogStreamOptions) => {
      latestLiveLogStreamOptions = liveLogStreamOptions;
      return { liveLogStreamConnected: true };
    });
    jest.spyOn(useLogsArchiveDownloadHook, "useLogsArchiveDownload").mockReturnValue({
      downloadingLogsArchive: false,
      downloadLogsArchive,
    });
  });

  it("shows the log settings without requesting logs or opening the live stream", async () => {
    await renderLogsCardWithLoadedSettings();

    expect(screen.getByText("cardLogs.subtitle")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "cardLogs.settingsTitle" })).toBeInTheDocument();
    expect(screen.getByText("cardLogs.settingsSubtitle")).toBeInTheDocument();
    expect(screen.getByLabelText("cardLogs.serverLogLevelLabel")).toHaveValue("INFO");
    expect(screen.getByLabelText("cardLogs.retentionDaysLabel")).toHaveValue("7");
    expect(screen.getByLabelText("cardLogs.maximumTotalSizeLabel")).toHaveValue("20");
    expect(screen.getByRole("checkbox", { name: "cardLogs.clientErrorReportingLabel" })).toBeChecked();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getLogSources).not.toHaveBeenCalled();
    expect(getLogHistory).not.toHaveBeenCalled();
    expect(useLiveLogStreamHook.useLiveLogStream).not.toHaveBeenCalled();
  });

  it("opens the logs in a modal and stops showing them when it closes", async () => {
    await openLogsViewerModal();

    expect(screen.getByRole("dialog")).toHaveTextContent("cardLogs.viewerModalTitle");
    expect(screen.getByTestId("logs-viewer")).toBeInTheDocument();

    fireEvent.click(screen.getByText("close-modal"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("logs-viewer")).not.toBeInTheDocument();
  });

  it("describes the selected server log level without hiding it", async () => {
    await renderLogsCardWithLoadedSettings();

    expect(screen.getByText("cardLogs.levelDescriptions.INFO")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("cardLogs.serverLogLevelLabel"), { target: { value: "DEBUG" } });

    expect(screen.getByText("cardLogs.levelDescriptions.DEBUG")).toBeInTheDocument();
    expect(screen.queryByText("cardLogs.levelDescriptions.INFO")).not.toBeInTheDocument();
  });

  it("keeps the save button disabled until a setting changes", async () => {
    await renderLogsCardWithLoadedSettings();

    expect(screen.getByText("cardLogs.saveSettingsButton")).toBeDisabled();

    fireEvent.change(screen.getByLabelText("cardLogs.retentionDaysLabel"), { target: { value: "14" } });

    expect(screen.getByText("cardLogs.saveSettingsButton")).not.toBeDisabled();
  });

  it("saves the level, retention, disk space and app error reporting together", async () => {
    await renderLogsCardWithLoadedSettings();

    fireEvent.change(screen.getByLabelText("cardLogs.serverLogLevelLabel"), { target: { value: "DEBUG" } });
    fireEvent.change(screen.getByLabelText("cardLogs.retentionDaysLabel"), { target: { value: "14" } });
    fireEvent.change(screen.getByLabelText("cardLogs.maximumTotalSizeLabel"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "cardLogs.clientErrorReportingLabel" }));
    await act(async () => {
      fireEvent.click(screen.getByText("cardLogs.saveSettingsButton"));
    });

    expect(updateLogSettings).toHaveBeenCalledWith({
      level: "DEBUG",
      retentionDays: 14,
      maximumTotalSizeMegabytes: 50,
      clientErrorReportingEnabled: false,
    });
    expect(screen.getByText("cardLogs.saveSettingsButton")).toBeDisabled();
  });

  it("loads the server log history and shows the live status", async () => {
    await openLogsViewerModal();

    expect(getLogHistory).toHaveBeenCalledWith(expect.objectContaining({ source: "server" }));
    expect(screen.getByText("cardLogs.liveConnected")).toBeInTheDocument();
  });

  it("appends live entries that match the active filters", async () => {
    await openLogsViewerModal();

    act(() => {
      latestLiveLogStreamOptions.onLogEntry({ ...serverLogEntry, message: "Live payment received" });
    });

    expect(screen.getByText("Live payment received")).toBeInTheDocument();
    expect(screen.getAllByTestId("log-entry-row")).toHaveLength(2);
  });

  it("shows why phoenixd logs are unavailable and does not stream them", async () => {
    await openLogsViewerModal();

    await act(async () => {
      fireEvent.change(screen.getByLabelText("cardLogs.sourceLabel"), { target: { value: "phoenixd" } });
    });

    expect(screen.getByTestId("logs-source-unavailable")).toHaveTextContent(
      "cardLogs.unavailableReasons.remote_lightning_backend",
    );
    expect(latestLiveLogStreamOptions).toEqual(expect.objectContaining({ source: "phoenixd", enabled: false }));
    expect(getLogHistory).not.toHaveBeenCalledWith(expect.objectContaining({ source: "phoenixd" }));
  });

  it("pauses the live stream when the live switch is turned off", async () => {
    await openLogsViewerModal();

    await act(async () => {
      fireEvent.click(screen.getByRole("checkbox", { name: "cardLogs.liveLabel" }));
    });

    expect(latestLiveLogStreamOptions.enabled).toBe(false);
    expect(screen.getByText("cardLogs.livePaused")).toBeInTheDocument();
  });

  it("downloads every log file from the card without opening the viewer", async () => {
    await renderLogsCardWithLoadedSettings();

    await act(async () => {
      fireEvent.click(screen.getByText("cardLogs.downloadAllButton"));
    });

    expect(downloadLogsArchive).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("downloads only the entries shown in the viewer", async () => {
    await openLogsViewerModal();
    act(() => {
      latestLiveLogStreamOptions.onLogEntry({ ...serverLogEntry, level: "WARN", message: "Live payment delayed" });
    });

    fireEvent.click(screen.getByText("cardLogs.downloadVisibleButton"));

    expect(downloadLogsArchive).not.toHaveBeenCalled();
    const [visibleLogEntriesFile, visibleLogEntriesFileName] = downloadBlob.mock.calls[0];
    expect(visibleLogEntriesFileName).toMatch(/^ambrosia-server-logs-\d{4}-\d{2}-\d{2}-\d{6}\.log$/);
    expect(await readBlobAsText(visibleLogEntriesFile)).toBe(
      "2026-11-19T10:00:00.000-06:00 INFO  [Server] Server started\n"
        + "2026-11-19T10:00:00.000-06:00 WARN  [Server] Live payment delayed\n",
    );
  });

  it("does not offer to download an empty view", async () => {
    await openLogsViewerModal();

    fireEvent.click(screen.getByText("cardLogs.clearButton"));

    expect(screen.getByText("cardLogs.downloadVisibleButton")).toBeDisabled();
  });
});
