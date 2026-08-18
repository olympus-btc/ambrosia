import { render, screen, fireEvent } from "@testing-library/react";

import { NotificationActions } from "../NotificationActions";

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ children, onPress }) => (
    <button onClick={onPress}>{children}</button>
  ),
}));

jest.mock("@/components/shared/MarkReadButton", () => ({
  MarkReadButton: ({ children, onPress }) => (
    <button onClick={onPress}>{children}</button>
  ),
}));

const notificationsTranslations = (translationKey) => ({
  "actions.delete": "Delete",
  "actions.markRead": "Mark read",
}[translationKey] || translationKey);

describe("NotificationActions", () => {
  it("renders read and delete actions for unread notifications", () => {
    render(
      <NotificationActions
        notification={{ id: "notification-1", readAt: null }}
        onDeleteNotification={jest.fn()}
        onMarkRead={jest.fn()}
        notificationsTranslations={notificationsTranslations}
      />,
    );

    expect(screen.getByText("Mark read")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("does not render mark read action for read notifications", () => {
    render(
      <NotificationActions
        notification={{ id: "notification-1", readAt: "2026-07-24T06:25:01Z" }}
        onDeleteNotification={jest.fn()}
        onMarkRead={jest.fn()}
        notificationsTranslations={notificationsTranslations}
      />,
    );

    expect(screen.queryByText("Mark read")).not.toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls action handlers with the notification id", () => {
    const onDeleteNotification = jest.fn();
    const onMarkRead = jest.fn();
    render(
      <NotificationActions
        notification={{ id: "notification-1", readAt: null }}
        onDeleteNotification={onDeleteNotification}
        onMarkRead={onMarkRead}
        notificationsTranslations={notificationsTranslations}
      />,
    );

    fireEvent.click(screen.getByText("Mark read"));
    fireEvent.click(screen.getByText("Delete"));

    expect(onMarkRead).toHaveBeenCalledWith("notification-1");
    expect(onDeleteNotification).toHaveBeenCalledWith("notification-1");
  });
});
