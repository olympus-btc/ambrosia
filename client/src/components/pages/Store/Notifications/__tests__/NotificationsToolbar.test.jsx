import { render, screen, fireEvent } from "@testing-library/react";

import { ADMIN_NOTIFICATION_CATEGORY_WALLET } from "@/lib/adminNotifications";

import { NotificationsToolbar } from "../NotificationsToolbar";

jest.mock("@heroui/react", () => ({
  Switch: ({ children, isSelected, onValueChange }) => (
    <button onClick={() => onValueChange(!isSelected)}>{children}</button>
  ),
  Tab: ({ title }) => <span>{title}</span>,
  Tabs: ({ children, onSelectionChange }) => (
    <div>
      {children}
      <button onClick={() => onSelectionChange("all")}>select-all</button>
    </div>
  ),
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ children, isDisabled, onPress }) => (
    <button disabled={isDisabled} onClick={onPress}>{children}</button>
  ),
}));

jest.mock("@/components/shared/MarkReadButton", () => ({
  MarkReadButton: ({ children, isDisabled, onPress }) => (
    <button disabled={isDisabled} onClick={onPress}>{children}</button>
  ),
}));

jest.mock("@/components/shared/RefreshButton", () => ({
  RefreshButton: ({ children, onPress }) => (
    <button onClick={onPress}>{children}</button>
  ),
}));

const notificationsTranslations = (translationKey) => ({
  "actions.deleteAll": "Delete all",
  "actions.markAllRead": "Mark all read",
  "actions.refresh": "Refresh",
  "filters.all": "All",
  "filters.unreadOnly": "Unread only",
  "filters.wallet": "Wallet",
  live: "Live",
  offline: "Reconnecting",
  title: "Notifications",
}[translationKey] || translationKey);

function renderNotificationsToolbar(props = {}) {
  const defaultProps = {
    filters: {
      category: ADMIN_NOTIFICATION_CATEGORY_WALLET,
      unreadOnly: false,
    },
    liveConnected: true,
    notificationCount: 2,
    notificationsTranslations,
    onDeleteAllNotifications: jest.fn(),
    onFiltersChange: jest.fn(),
    onMarkAllRead: jest.fn(),
    onRefresh: jest.fn(),
    unreadCount: 1,
  };

  return {
    props: { ...defaultProps, ...props },
    ...render(<NotificationsToolbar {...defaultProps} {...props} />),
  };
}

describe("NotificationsToolbar", () => {
  it("renders filters and live state", () => {
    renderNotificationsToolbar();

    expect(screen.getByText("Wallet")).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders offline state when live channel is disconnected", () => {
    renderNotificationsToolbar({ liveConnected: false });

    expect(screen.getByText("Reconnecting")).toBeInTheDocument();
  });

  it("updates unread-only and category filters", () => {
    const onFiltersChange = jest.fn();
    renderNotificationsToolbar({ onFiltersChange });

    fireEvent.click(screen.getByText("Unread only"));
    fireEvent.click(screen.getByText("select-all"));

    expect(onFiltersChange).toHaveBeenCalledWith({ unreadOnly: true });
    expect(onFiltersChange).toHaveBeenCalledWith({ category: null });
  });

  it("calls toolbar action handlers", () => {
    const onDeleteAllNotifications = jest.fn();
    const onMarkAllRead = jest.fn();
    const onRefresh = jest.fn();
    renderNotificationsToolbar({
      onDeleteAllNotifications,
      onMarkAllRead,
      onRefresh,
    });

    fireEvent.click(screen.getByText("Refresh"));
    fireEvent.click(screen.getByText("Mark all read"));
    fireEvent.click(screen.getByText("Delete all"));

    expect(onRefresh).toHaveBeenCalled();
    expect(onMarkAllRead).toHaveBeenCalled();
    expect(onDeleteAllNotifications).toHaveBeenCalled();
  });

  it("disables bulk actions when there is nothing to update", () => {
    renderNotificationsToolbar({ notificationCount: 0, unreadCount: 0 });

    expect(screen.getByText("Mark all read")).toBeDisabled();
    expect(screen.getByText("Delete all")).toBeDisabled();
  });
});
