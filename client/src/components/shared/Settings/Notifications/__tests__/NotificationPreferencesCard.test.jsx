import { addToast } from "@heroui/react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { useAdminNotificationPreferences } from "@/hooks/useAdminNotificationPreferences";
import { useAdminWebPush } from "@/hooks/useAdminWebPush";
import {
  ADMIN_NOTIFICATION_CATEGORY_WALLET,
  ADMIN_NOTIFICATION_PREFERENCES_CHANGED_EVENT,
} from "@/lib/adminNotifications";

import { NotificationPreferencesCard } from "../NotificationPreferencesCard";

jest.mock("@/hooks/useAdminNotificationPreferences", () => ({
  useAdminNotificationPreferences: jest.fn(),
}));

jest.mock("@/hooks/useAdminWebPush", () => ({
  useAdminWebPush: jest.fn(),
}));

jest.mock("@lib/isElectron", () => ({
  get isElectron() {
    return global.__mockIsElectron ?? false;
  },
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey) => ({
    "cardNotifications.error": "Could not load notification settings",
    "cardNotifications.inApp": "In-app",
    "cardNotifications.push": "Web Push",
    "cardNotifications.pushErrorTitle": "Could not enable Web Push",
    "cardNotifications.pushErrors.vapidUnavailable": "Web Push is not configured",
    "cardNotifications.subtitle": "Choose how admins receive important activity alerts.",
    "cardNotifications.testPush": "Test push",
    "cardNotifications.title": "Notifications",
    "cardNotifications.walletTitle": "Wallet activity",
    "webPush.active": "Browser push enabled on this device",
    "webPush.endpoint": "Endpoint",
    "webPush.permissionRequired": "Browser permission required",
  }[translationKey] || translationKey),
}));

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ children, isDisabled, onPress }) => (
    <button disabled={isDisabled} onClick={onPress}>{children}</button>
  ),
  Card: ({ children }) => <section>{children}</section>,
  CardBody: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  Switch: ({ children, isDisabled, isSelected, onValueChange }) => (
    <button
      aria-pressed={isSelected}
      disabled={isDisabled}
      onClick={() => onValueChange(!isSelected)}
    >
      {children}
    </button>
  ),
}));

describe("NotificationPreferencesCard", () => {
  const walletPreference = {
    category: ADMIN_NOTIFICATION_CATEGORY_WALLET,
    inAppEnabled: true,
    pushEnabled: true,
  };
  const updatePreference = jest.fn();
  const subscribe = jest.fn();
  const unsubscribe = jest.fn();
  const showTestNotification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.__mockIsElectron = false;
    updatePreference.mockResolvedValue(walletPreference);
    subscribe.mockResolvedValue({ ok: true });
    unsubscribe.mockResolvedValue({ ok: true });
    showTestNotification.mockResolvedValue({ ok: true });
    useAdminNotificationPreferences.mockReturnValue({
      error: null,
      loading: false,
      savingPreference: false,
      updatePreference,
      walletPreference,
    });
    useAdminWebPush.mockReturnValue({
      error: null,
      isSupported: true,
      loading: false,
      permission: "granted",
      showTestNotification,
      subscribe,
      subscriptionEndpoint: "https://push.example/subscription",
      subscriptionSummary: {
        endpointHash: "abcdef123456",
        endpointHost: "push.example",
      },
      unsubscribe,
    });
  });

  afterEach(() => {
    delete global.__mockIsElectron;
  });

  it("renders wallet notification preferences and endpoint summary", () => {
    render(<NotificationPreferencesCard />);

    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Wallet activity")).toBeInTheDocument();
    expect(screen.getByText("Browser push enabled on this device")).toBeInTheDocument();
    expect(screen.getByText(/push.example/)).toBeInTheDocument();
    expect(screen.getByText(/abcdef123456/)).toBeInTheDocument();
  });

  it("hides Web Push controls in Electron", () => {
    global.__mockIsElectron = true;

    render(<NotificationPreferencesCard />);

    expect(screen.getByText("In-app")).toBeInTheDocument();
    expect(screen.queryByText("Web Push")).not.toBeInTheDocument();
    expect(screen.queryByText("Test push")).not.toBeInTheDocument();
    expect(screen.queryByText("Browser push enabled on this device")).not.toBeInTheDocument();
    expect(screen.queryByText(/push.example/)).not.toBeInTheDocument();
    expect(useAdminWebPush).toHaveBeenCalledWith({ enabled: false });
  });

  it("updates in-app preference and notifies listeners", async () => {
    const dispatchEvent = jest.spyOn(window, "dispatchEvent");

    render(<NotificationPreferencesCard />);

    fireEvent.click(screen.getByText("In-app"));

    await waitFor(() => expect(updatePreference).toHaveBeenCalledWith({
      ...walletPreference,
      inAppEnabled: false,
    }));
    expect(dispatchEvent).toHaveBeenCalledWith(new Event(ADMIN_NOTIFICATION_PREFERENCES_CHANGED_EVENT));
  });

  it("subscribes before enabling Web Push preference", async () => {
    useAdminNotificationPreferences.mockReturnValueOnce({
      error: null,
      loading: false,
      savingPreference: false,
      updatePreference,
      walletPreference: {
        ...walletPreference,
        pushEnabled: false,
      },
    });
    useAdminWebPush.mockReturnValueOnce({
      error: null,
      isSupported: true,
      loading: false,
      permission: "default",
      showTestNotification,
      subscribe,
      subscriptionEndpoint: null,
      subscriptionSummary: null,
      unsubscribe,
    });

    render(<NotificationPreferencesCard />);

    fireEvent.click(screen.getByText("Web Push"));

    await waitFor(() => expect(subscribe).toHaveBeenCalled());
    expect(updatePreference).toHaveBeenCalledWith(expect.objectContaining({ pushEnabled: true }));
  });

  it("shows an error toast when Web Push cannot be enabled", async () => {
    subscribe.mockResolvedValueOnce({ ok: false, reason: "vapidUnavailable" });
    useAdminNotificationPreferences.mockReturnValueOnce({
      error: null,
      loading: false,
      savingPreference: false,
      updatePreference,
      walletPreference: {
        ...walletPreference,
        pushEnabled: false,
      },
    });
    useAdminWebPush.mockReturnValueOnce({
      error: null,
      isSupported: true,
      loading: false,
      permission: "default",
      showTestNotification,
      subscribe,
      subscriptionEndpoint: null,
      subscriptionSummary: null,
      unsubscribe,
    });

    render(<NotificationPreferencesCard />);

    fireEvent.click(screen.getByText("Web Push"));

    await waitFor(() => expect(addToast).toHaveBeenCalledWith({
      color: "danger",
      title: "Could not enable Web Push",
      description: "Web Push is not configured",
    }));
    expect(updatePreference).not.toHaveBeenCalled();
  });

  it("renders nothing when wallet preference is missing without an error", () => {
    useAdminNotificationPreferences.mockReturnValueOnce({
      error: null,
      loading: false,
      savingPreference: false,
      updatePreference,
      walletPreference: null,
    });

    const { container } = render(<NotificationPreferencesCard />);

    expect(container).toBeEmptyDOMElement();
  });
});
