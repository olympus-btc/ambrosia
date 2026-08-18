import { act, renderHook, waitFor } from "@testing-library/react";

import { ADMIN_NOTIFICATION_CATEGORY_WALLET } from "@/lib/adminNotifications";
import {
  getAdminNotificationPreferences,
  updateAdminNotificationPreference,
} from "@/services/adminNotificationsService";

import { useAdminNotificationPreferences } from "../useAdminNotificationPreferences";

jest.mock("@/services/adminNotificationsService", () => ({
  getAdminNotificationPreferences: jest.fn(),
  updateAdminNotificationPreference: jest.fn(),
}));

describe("useAdminNotificationPreferences", () => {
  const walletPreference = {
    category: ADMIN_NOTIFICATION_CATEGORY_WALLET,
    inAppEnabled: true,
    pushEnabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getAdminNotificationPreferences.mockResolvedValue([walletPreference]);
    updateAdminNotificationPreference.mockImplementation(async (preferenceUpdate) => preferenceUpdate);
  });

  it("loads notification preferences and exposes the wallet preference", async () => {
    const renderedPreferencesHook = renderHook(() => useAdminNotificationPreferences());

    expect(renderedPreferencesHook.result.current.loading).toBe(true);

    await waitFor(() => expect(renderedPreferencesHook.result.current.loading).toBe(false));

    expect(getAdminNotificationPreferences).toHaveBeenCalled();
    expect(renderedPreferencesHook.result.current.preferences).toEqual([walletPreference]);
    expect(renderedPreferencesHook.result.current.walletPreference).toEqual(walletPreference);
    expect(renderedPreferencesHook.result.current.error).toBeNull();
  });

  it("uses an empty preference list when backend response is not an array", async () => {
    getAdminNotificationPreferences.mockResolvedValueOnce(null);

    const renderedPreferencesHook = renderHook(() => useAdminNotificationPreferences());

    await waitFor(() => expect(renderedPreferencesHook.result.current.loading).toBe(false));

    expect(renderedPreferencesHook.result.current.preferences).toEqual([]);
    expect(renderedPreferencesHook.result.current.walletPreference).toBeUndefined();
  });

  it("stores fetch errors and clears preferences", async () => {
    const fetchError = new Error("failed");
    getAdminNotificationPreferences.mockRejectedValueOnce(fetchError);

    const renderedPreferencesHook = renderHook(() => useAdminNotificationPreferences());

    await waitFor(() => expect(renderedPreferencesHook.result.current.loading).toBe(false));

    expect(renderedPreferencesHook.result.current.preferences).toEqual([]);
    expect(renderedPreferencesHook.result.current.error).toBe(fetchError);
  });

  it("updates an existing preference", async () => {
    const updatedWalletPreference = {
      category: ADMIN_NOTIFICATION_CATEGORY_WALLET,
      inAppEnabled: false,
      pushEnabled: true,
    };
    updateAdminNotificationPreference.mockResolvedValueOnce(updatedWalletPreference);
    const renderedPreferencesHook = renderHook(() => useAdminNotificationPreferences());

    await waitFor(() => expect(renderedPreferencesHook.result.current.loading).toBe(false));

    await act(async () => {
      await renderedPreferencesHook.result.current.updatePreference(updatedWalletPreference);
    });

    expect(updateAdminNotificationPreference).toHaveBeenCalledWith(updatedWalletPreference);
    expect(renderedPreferencesHook.result.current.preferences).toEqual([updatedWalletPreference]);
    expect(renderedPreferencesHook.result.current.walletPreference).toEqual(updatedWalletPreference);
  });

  it("adds a new preference returned by the backend", async () => {
    const reportsPreference = {
      category: "reports",
      inAppEnabled: true,
      pushEnabled: false,
    };
    updateAdminNotificationPreference.mockResolvedValueOnce(reportsPreference);
    const renderedPreferencesHook = renderHook(() => useAdminNotificationPreferences());

    await waitFor(() => expect(renderedPreferencesHook.result.current.loading).toBe(false));

    await act(async () => {
      await renderedPreferencesHook.result.current.updatePreference(reportsPreference);
    });

    expect(renderedPreferencesHook.result.current.preferences).toEqual([walletPreference, reportsPreference]);
  });

  it("returns null and stores errors when update fails", async () => {
    const updateError = new Error("failed");
    updateAdminNotificationPreference.mockRejectedValueOnce(updateError);
    const renderedPreferencesHook = renderHook(() => useAdminNotificationPreferences());

    await waitFor(() => expect(renderedPreferencesHook.result.current.loading).toBe(false));

    let updatedPreference;
    await act(async () => {
      updatedPreference = await renderedPreferencesHook.result.current.updatePreference({
        category: ADMIN_NOTIFICATION_CATEGORY_WALLET,
        inAppEnabled: false,
        pushEnabled: true,
      });
    });

    expect(updatedPreference).toBeNull();
    expect(renderedPreferencesHook.result.current.error).toBe(updateError);
    expect(renderedPreferencesHook.result.current.savingPreference).toBe(false);
  });
});
