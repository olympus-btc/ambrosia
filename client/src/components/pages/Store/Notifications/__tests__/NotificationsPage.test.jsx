import { render, screen } from "@testing-library/react";

import { useAdminNotifications } from "../hooks/useAdminNotifications";
import { Notifications } from "../Notifications";

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey, interpolationValues = {}) => {
    const messages = {
      "actions.delete": "Delete",
      "actions.deleteAll": "Delete all",
      "actions.markAllRead": "Mark all read",
      "actions.markRead": "Mark read",
      "actions.refresh": "Refresh",
      "display.actorExternalPayment": "External payment",
      "display.fallbackActor": "---",
      "display.fallbackAmount": "the selected amount",
      "display.fallbackRole": "---",
      "display.roleWallet": "Wallet",
      "display.statusSuccess": "Success",
      "display.walletPaymentReceivedDescription": "A payment of {amount} was received in the wallet.",
      "display.walletPaymentReceivedTitle": "Payment received in wallet",
      "filters.all": "All",
      "filters.unreadOnly": "Unread only",
      "filters.wallet": "Wallet",
      "fields.actor": "Actor",
      "fields.occurredAt": "Occurred",
      "fields.role": "Role",
      live: "Live",
      "list.title": "{count} notification",
      "statuses.read": "Read",
      "statuses.unread": "Unread",
      subtitle: "Review important activity across wallet and admin workflows.",
      "table.action": "Action",
      "table.amount": "Amount",
      "table.notification": "Notification",
      title: "Admin notifications",
    };
    const translationTemplate = messages[translationKey] || translationKey;
    return Object.entries(interpolationValues).reduce(
      (translatedText, [placeholderName, placeholderValue]) => (
        translatedText.replaceAll(`{${placeholderName}}`, placeholderValue)
      ),
      translationTemplate,
    );
  },
}));

jest.mock("../hooks/useAdminNotifications", () => ({
  useAdminNotifications: jest.fn(),
}));

jest.mock("@/components/shared/PageHeader", () => ({
  PageHeader: ({ title, subtitle }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children }) => <section>{children}</section>,
  CardBody: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  Switch: ({ children, isSelected, onValueChange }) => (
    <button onClick={() => onValueChange(!isSelected)}>{children}</button>
  ),
  Tab: ({ title }) => <span>{title}</span>,
  Tabs: ({ children }) => <div>{children}</div>,
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ children, onPress }) => <button onClick={onPress}>{children}</button>,
}));

jest.mock("@/components/shared/MarkReadButton", () => ({
  MarkReadButton: ({ children, onPress }) => <button onClick={onPress}>{children}</button>,
}));

jest.mock("@/components/shared/RefreshButton", () => ({
  RefreshButton: ({ children, onPress }) => <button onClick={onPress}>{children}</button>,
}));

describe("Notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAdminNotifications.mockReturnValue({
      deleteAllNotifications: jest.fn(),
      deleteNotification: jest.fn(),
      error: null,
      filters: { category: "wallet", unreadOnly: false },
      liveConnected: true,
      loading: false,
      markAllRead: jest.fn(),
      markRead: jest.fn(),
      notifications: [
        {
          id: "notification-1",
          category: "wallet",
          type: "wallet.payment.received",
          metadataJson: JSON.stringify({ amountSats: 90 }),
          occurredAt: "2026-07-24T06:25:01.699301Z",
        },
      ],
      refetch: jest.fn(),
      unreadCount: 1,
      updateFilters: jest.fn(),
    });
  });

  it("renders the notification page shell with toolbar and feed", () => {
    render(<Notifications />);

    expect(screen.getByRole("heading", { name: "Admin notifications" })).toBeInTheDocument();
    expect(screen.getByText("Review important activity across wallet and admin workflows.")).toBeInTheDocument();
    expect(screen.getByText("1 notification")).toBeInTheDocument();
    expect(screen.getAllByText("Wallet").length).toBeGreaterThan(0);
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getAllByText("Payment received in wallet")).toHaveLength(2);
  });
});
