import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { changeServerLogLevel, getLogHistory, getLogSources, getServerLogLevel } from "@/services/logsService";

import * as useLiveLogStreamHook from "../hooks/useLiveLogStream";
import * as useLogsArchiveDownloadHook from "../hooks/useLogsArchiveDownload";
import { LogsCard } from "../LogsCard";

jest.mock("@/services/logsService", () => ({
  getLogSources: jest.fn(),
  getLogHistory: jest.fn(),
  getServerLogLevel: jest.fn(),
  changeServerLogLevel: jest.fn(),
}));
jest.mock("../hooks/useLiveLogStream");
jest.mock("../hooks/useLogsArchiveDownload");

jest.mock("@heroui/react", () => {
  const { Children } = jest.requireActual("react");
  return {
    addToast: jest.fn(),
    Button: ({ onPress, children, isLoading, "aria-expanded": ariaExpanded }) => (
      <button type="button" disabled={isLoading} aria-expanded={ariaExpanded} onClick={onPress}>{children}</button>
    ),
    Card: ({ children }) => <div>{children}</div>,
    CardHeader: ({ children }) => <div>{children}</div>,
    CardBody: ({ children }) => <div>{children}</div>,
    Chip: ({ children }) => <span>{children}</span>,
    Input: ({ label, value, onValueChange }) => (
      <input aria-label={label} value={value} onChange={(inputChangeEvent) => onValueChange(inputChangeEvent.target.value)} />
    ),
    Select: ({ label, selectedKeys, onChange, children, isDisabled }) => (
      <select aria-label={label} value={selectedKeys?.[0] ?? ""} onChange={onChange} disabled={isDisabled}>
        <option value="" />
        {Children.map(children, (selectItemElement) => (
          <option value={selectItemElement.key}>{selectItemElement.props.children}</option>
        ))}
      </select>
    ),
    SelectItem: ({ children }) => children,
    Spinner: () => <span>spinner</span>,
    Switch: ({ isSelected, onValueChange, children }) => (
      <label>
        <input type="checkbox" checked={isSelected} onChange={(switchChangeEvent) => onValueChange(switchChangeEvent.target.checked)} />
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

let latestLiveLogStreamOptions;
let downloadLogsArchive;

function mockLogsApi() {
  getLogSources.mockResolvedValue(logSourcesResponseBody.sources);
  getLogHistory.mockResolvedValue([serverLogEntry]);
  getServerLogLevel.mockResolvedValue("INFO");
  changeServerLogLevel.mockImplementation(async (requestedServerLogLevel) => requestedServerLogLevel);
}

function findLogsCardToggle() {
  return screen.getByRole("button", { name: /cardLogs\.(showLogsButton|hideLogsButton)/ });
}

async function renderLogsCard() {
  render(<LogsCard />);
  await act(async () => {
    fireEvent.click(findLogsCardToggle());
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

  it("starts collapsed without requesting logs or opening the live stream", () => {
    render(<LogsCard />);

    expect(findLogsCardToggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("cardLogs.subtitle")).toBeInTheDocument();
    expect(findLogsCardToggle()).toHaveTextContent("cardLogs.showLogsButton");
    expect(screen.queryByTestId("logs-viewer")).not.toBeInTheDocument();
    expect(getLogSources).not.toHaveBeenCalled();
    expect(getLogHistory).not.toHaveBeenCalled();
    expect(getServerLogLevel).not.toHaveBeenCalled();
    expect(useLiveLogStreamHook.useLiveLogStream).not.toHaveBeenCalled();
  });

  it("collapses again and stops showing the logs", async () => {
    await renderLogsCard();

    expect(findLogsCardToggle()).toHaveAttribute("aria-expanded", "true");
    expect(findLogsCardToggle()).toHaveTextContent("cardLogs.hideLogsButton");
    fireEvent.click(findLogsCardToggle());

    expect(findLogsCardToggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("logs-viewer")).not.toBeInTheDocument();
  });

  it("loads the server log history and shows the live status", async () => {
    await renderLogsCard();

    expect(getLogHistory).toHaveBeenCalledWith(expect.objectContaining({ source: "server" }));
    expect(screen.getByText("cardLogs.liveConnected")).toBeInTheDocument();
  });

  it("appends live entries that match the active filters", async () => {
    await renderLogsCard();

    act(() => {
      latestLiveLogStreamOptions.onLogEntry({ ...serverLogEntry, message: "Live payment received" });
    });

    expect(screen.getByText("Live payment received")).toBeInTheDocument();
    expect(screen.getAllByTestId("log-entry-row")).toHaveLength(2);
  });

  it("shows why phoenixd logs are unavailable and does not stream them", async () => {
    await renderLogsCard();

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
    await renderLogsCard();

    await act(async () => {
      fireEvent.click(screen.getByRole("checkbox"));
    });

    expect(latestLiveLogStreamOptions.enabled).toBe(false);
    expect(screen.getByText("cardLogs.livePaused")).toBeInTheDocument();
  });

  it("downloads the logs archive", async () => {
    await renderLogsCard();

    await act(async () => {
      fireEvent.click(screen.getByText("cardLogs.downloadButton"));
    });

    expect(downloadLogsArchive).toHaveBeenCalled();
  });

  it("updates the server log level", async () => {
    await renderLogsCard();
    await waitFor(() => expect(screen.getByLabelText("cardLogs.serverLogLevelLabel")).not.toBeDisabled());

    await act(async () => {
      fireEvent.change(screen.getByLabelText("cardLogs.serverLogLevelLabel"), { target: { value: "DEBUG" } });
    });

    expect(changeServerLogLevel).toHaveBeenCalledWith("DEBUG");
  });
});
