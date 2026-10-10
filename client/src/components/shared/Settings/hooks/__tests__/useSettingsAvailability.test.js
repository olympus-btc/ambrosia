import { renderHook } from "@testing-library/react";

import { useSettingsAvailability } from "../useSettingsAvailability";

jest.mock("@lib/isElectron", () => ({
  get isElectron() { return global.__mockIsElectron ?? false; },
}));

jest.mock("@hooks/usePWA", () => ({
  useIsStandalone: jest.fn(),
  useIsIOS: jest.fn(),
  useIsAndroid: jest.fn(),
  useInstallPrompt: jest.fn(),
}));

const { useIsStandalone, useIsIOS, useIsAndroid, useInstallPrompt } = require("@hooks/usePWA");

beforeEach(() => {
  jest.clearAllMocks();
  global.__mockIsElectron = false;
  useIsStandalone.mockReturnValue(false);
  useIsIOS.mockReturnValue(false);
  useIsAndroid.mockReturnValue(false);
  useInstallPrompt.mockReturnValue({ isInstallable: false, promptInstall: jest.fn() });
});

function tabKeys(settingsAvailabilityHook) {
  return settingsAvailabilityHook.current.availableTabs.map((tab) => tab.key);
}

describe("useSettingsAvailability", () => {
  it("includes only the always-visible tabs for a non-admin role with no device capabilities", () => {
    const { result: settingsAvailabilityHook } = renderHook(() => useSettingsAvailability({ isAdmin: false }));

    expect(tabKeys(settingsAvailabilityHook)).toEqual(["business", "preferences", "printing"]);
  });

  it("includes the admin-only tabs for an admin role", () => {
    const { result: settingsAvailabilityHook } = renderHook(() => useSettingsAvailability({ isAdmin: true }));

    expect(tabKeys(settingsAvailabilityHook)).toEqual(["business", "preferences", "wallet", "backup", "printing", "system", "help"]);
  });

  it("excludes the devices tab when neither SecureConnection nor InstallPWA would render anything", () => {
    const { result: settingsAvailabilityHook } = renderHook(() => useSettingsAvailability({ isAdmin: false }));

    expect(settingsAvailabilityHook.current.devicesTabAvailable).toBe(false);
    expect(tabKeys(settingsAvailabilityHook)).not.toContain("devices");
  });

  it("includes the devices tab when InstallPWA is installable", () => {
    useInstallPrompt.mockReturnValue({ isInstallable: true, promptInstall: jest.fn() });

    const { result: settingsAvailabilityHook } = renderHook(() => useSettingsAvailability({ isAdmin: false }));

    expect(settingsAvailabilityHook.current.installPWAAvailable).toBe(true);
    expect(settingsAvailabilityHook.current.devicesTabAvailable).toBe(true);
    expect(tabKeys(settingsAvailabilityHook)).toContain("devices");
  });

  it("includes the devices tab when on iOS even without an install prompt", () => {
    useIsIOS.mockReturnValue(true);

    const { result: settingsAvailabilityHook } = renderHook(() => useSettingsAvailability({ isAdmin: false }));

    expect(settingsAvailabilityHook.current.installPWAAvailable).toBe(true);
    expect(tabKeys(settingsAvailabilityHook)).toContain("devices");
  });

  it("excludes the devices tab in Electron even when InstallPWA would otherwise be installable", () => {
    global.__mockIsElectron = true;
    useInstallPrompt.mockReturnValue({ isInstallable: true, promptInstall: jest.fn() });

    const { result: settingsAvailabilityHook } = renderHook(() => useSettingsAvailability({ isAdmin: false }));

    expect(settingsAvailabilityHook.current.installPWAAvailable).toBe(false);
    expect(settingsAvailabilityHook.current.devicesTabAvailable).toBe(false);
    expect(tabKeys(settingsAvailabilityHook)).not.toContain("devices");
  });

  it("excludes InstallPWA availability when already running standalone", () => {
    useIsStandalone.mockReturnValue(true);
    useInstallPrompt.mockReturnValue({ isInstallable: true, promptInstall: jest.fn() });

    const { result: settingsAvailabilityHook } = renderHook(() => useSettingsAvailability({ isAdmin: false }));

    expect(settingsAvailabilityHook.current.installPWAAvailable).toBe(false);
  });
});
