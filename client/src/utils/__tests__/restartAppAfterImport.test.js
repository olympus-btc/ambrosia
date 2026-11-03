import { restartAppAfterImport } from "../restartAppAfterImport";

let mockIsElectron = false;
jest.mock("@lib/isElectron", () => ({
  get isElectron() {
    return mockIsElectron;
  },
}));

describe("restartAppAfterImport", () => {
  beforeEach(() => {
    mockIsElectron = false;
  });

  afterEach(() => {
    delete window.electron;
  });

  it("returns false without invoking any IPC channel outside Electron", async () => {
    const restartTriggered = await restartAppAfterImport();

    expect(restartTriggered).toBe(false);
  });

  it("invokes app:relaunch and returns true inside Electron", async () => {
    mockIsElectron = true;
    const mockInvoke = jest.fn().mockResolvedValue(undefined);
    window.electron = { ipc: { invoke: mockInvoke } };

    const restartTriggered = await restartAppAfterImport();

    expect(mockInvoke).toHaveBeenCalledWith("app:relaunch");
    expect(restartTriggered).toBe(true);
  });
});
