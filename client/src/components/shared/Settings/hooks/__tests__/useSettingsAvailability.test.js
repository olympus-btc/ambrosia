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

describe("useSettingsAvailability", () => {
  it("marks the devices tab unavailable when neither SecureConnection nor InstallPWA would render anything", () => {
    const { result: settingsAvailabilityHook } = renderHook(() => useSettingsAvailability());

    expect(settingsAvailabilityHook.current.devicesTabAvailable).toBe(false);
  });

  it("marks the devices tab available when InstallPWA is installable", () => {
    useInstallPrompt.mockReturnValue({ isInstallable: true, promptInstall: jest.fn() });

    const { result: settingsAvailabilityHook } = renderHook(() => useSettingsAvailability());

    expect(settingsAvailabilityHook.current.installPWAAvailable).toBe(true);
    expect(settingsAvailabilityHook.current.devicesTabAvailable).toBe(true);
  });

  it("marks InstallPWA available on iOS even without an install prompt", () => {
    useIsIOS.mockReturnValue(true);

    const { result: settingsAvailabilityHook } = renderHook(() => useSettingsAvailability());

    expect(settingsAvailabilityHook.current.installPWAAvailable).toBe(true);
  });

  it("marks the devices tab unavailable in Electron even when InstallPWA would otherwise be installable", () => {
    global.__mockIsElectron = true;
    useInstallPrompt.mockReturnValue({ isInstallable: true, promptInstall: jest.fn() });

    const { result: settingsAvailabilityHook } = renderHook(() => useSettingsAvailability());

    expect(settingsAvailabilityHook.current.installPWAAvailable).toBe(false);
    expect(settingsAvailabilityHook.current.devicesTabAvailable).toBe(false);
  });

  it("excludes InstallPWA availability when already running standalone", () => {
    useIsStandalone.mockReturnValue(true);
    useInstallPrompt.mockReturnValue({ isInstallable: true, promptInstall: jest.fn() });

    const { result: settingsAvailabilityHook } = renderHook(() => useSettingsAvailability());

    expect(settingsAvailabilityHook.current.installPWAAvailable).toBe(false);
  });
});
