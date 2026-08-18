import { render, screen } from "@testing-library/react";

import { NotificationMeta, NotificationStatus } from "../NotificationMeta";

const notificationsTranslations = (translationKey) => ({
  "fields.actor": "Actor",
  "fields.occurredAt": "Occurred",
  "fields.role": "Role",
  "statuses.read": "Read",
  "statuses.unread": "Unread",
}[translationKey] || translationKey);

describe("NotificationStatus", () => {
  it("renders unread status", () => {
    render(<NotificationStatus isUnread notificationsTranslations={notificationsTranslations} />);

    expect(screen.getByText("Unread")).toHaveClass("text-green-800");
  });

  it("renders read status", () => {
    render(<NotificationStatus isUnread={false} notificationsTranslations={notificationsTranslations} />);

    expect(screen.getByText("Read")).toHaveClass("text-gray-500");
  });
});

describe("NotificationMeta", () => {
  it("renders actor, role, and occurred timestamp", () => {
    const { container } = render(
      <NotificationMeta
        notification={{ occurredAt: "2026-07-24T06:25:01.699301Z" }}
        notificationDisplay={{
          actorLabel: "Seller",
          roleLabel: "Admin",
        }}
        notificationsTranslations={notificationsTranslations}
      />,
    );

    expect(container).toHaveTextContent("Actor: Seller");
    expect(container).toHaveTextContent("Role: Admin");
    expect(container).toHaveTextContent("Occurred:");
    expect(screen.getByText("Seller")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
});
