"use client";

import Link from "next/link";

import { Menu } from "lucide-react";

import { ADMIN_NOTIFICATIONS_ROUTE } from "@/lib/adminNotifications";

import { NavIcon } from "./NavIcon";
import { NotificationBadge } from "./NotificationBadge";

export function BottomNav({
  isAuth,
  items,
  pathname,
  navbarTranslations,
  notificationUnreadCount,
  onMenuClick,
}) {
  return (
    <nav
      data-testid="bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-30 bg-primary-500 flex items-center gap-2 px-2 h-16 md:hidden"
    >
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 text-slate-100 hover:bg-green-300 hover:text-green-800 rounded-xl transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] leading-none">{navbarTranslations("menu")}</span>
      </button>

      {isAuth && items.map((item, index) => {
        const isActive = pathname === item.path || pathname.startsWith(item.path);
        return (
          <Link
            key={`${item.path}-${index}`}
            href={item.path}
            className={`relative flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition-all ${
              isActive
                ? "bg-green-300 text-green-800"
                : "text-slate-100 hover:bg-green-300 hover:text-green-800"
            }`}
          >
            <NavIcon name={item.icon} className="w-5 h-5" />
            <NotificationBadge
              count={item.path === ADMIN_NOTIFICATIONS_ROUTE ? notificationUnreadCount : 0}
              className="absolute right-4 top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold text-white"
            />
            <span className={`text-[10px] leading-none ${isActive ? "font-semibold" : ""}`}>
              {navbarTranslations(item.label)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
