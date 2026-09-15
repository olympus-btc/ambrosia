import { act, renderHook, waitFor } from "@testing-library/react";

import { getSecretsLockStatus, SECRETS_UNLOCKED_EVENT } from "@/services/secretsService";

import { useSecretsLockSignal } from "../useSecretsLockSignal";

jest.mock("@/services/secretsService", () => ({
  getSecretsLockStatus: jest.fn(),
  SECRETS_UNLOCKED_EVENT: "secrets:unlocked",
}));

function renderSecretsLockSignal(enabled = true) {
  return renderHook(() => useSecretsLockSignal({ enabled }));
}

describe("useSecretsLockSignal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches the lock status once when enabled", async () => {
    getSecretsLockStatus.mockResolvedValue({ locked: true });

    const { result } = renderSecretsLockSignal(true);

    await waitFor(() => expect(result.current.secretsLocked).toBe(true));
    expect(getSecretsLockStatus).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when disabled", () => {
    renderSecretsLockSignal(false);

    expect(getSecretsLockStatus).not.toHaveBeenCalled();
  });

  it("refreshes when SECRETS_UNLOCKED_EVENT fires", async () => {
    getSecretsLockStatus.mockResolvedValue({ locked: true });
    const { result } = renderSecretsLockSignal(true);
    await waitFor(() => expect(result.current.secretsLocked).toBe(true));

    getSecretsLockStatus.mockResolvedValue({ locked: false });
    act(() => {
      window.dispatchEvent(new Event(SECRETS_UNLOCKED_EVENT));
    });

    await waitFor(() => expect(result.current.secretsLocked).toBe(false));
    expect(getSecretsLockStatus).toHaveBeenCalledTimes(2);
  });

  it("defaults to false when the fetch fails", async () => {
    getSecretsLockStatus.mockRejectedValue(new Error("network error"));

    const { result } = renderSecretsLockSignal(true);

    await waitFor(() => expect(getSecretsLockStatus).toHaveBeenCalled());
    expect(result.current.secretsLocked).toBe(false);
  });
});
