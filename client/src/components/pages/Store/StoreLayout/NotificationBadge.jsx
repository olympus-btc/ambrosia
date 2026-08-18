"use client";

function formatNotificationBadgeCount(count) {
  return count > 99 ? "99+" : count;
}

export function NotificationBadge({ count, className }) {
  if (!count) return null;

  return (
    <span className={className}>
      {formatNotificationBadgeCount(count)}
    </span>
  );
}
