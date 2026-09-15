"use client";

import Image from "next/image";
import Link from "next/link";

import { LogOut } from "lucide-react";

import { ADMIN_NOTIFICATIONS_ROUTE } from "@/lib/adminNotifications";

import ambrosia from "../../../../../public/ambrosia.svg";

import { LockedBadge } from "./LockedBadge";
import { NavIcon } from "./NavIcon";
import { NotificationBadge } from "./NotificationBadge";

const WALLET_ROUTE = "/store/wallet";

function NavBarButton({ text, icon, href, isActive, id, onClick, badgeCount, isLocked, onLockClick }) {
  const handleClick = (event) => {
    if (isLocked) {
      event.preventDefault();
      onLockClick?.();
      return;
    }
    onClick?.();
  };

  const rowStateClassName = isLocked
    ? "bg-red-800 text-slate-100 hover:bg-red-600/80"
    : isActive
      ? "bg-green-300 text-green-800 hover:bg-green-300 hover:text-green-800"
      : "text-slate-100 hover:bg-green-300 hover:text-green-800";

  return (
    <Link
      id={id}
      href={href}
      onClick={handleClick}
      className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${rowStateClassName}`}
    >
      <NavIcon name={icon} className="w-6 h-6 md:w-5 md:h-5 lg:w-6 lg:h-6" />
      <span className="pl-2 text-2xl md:text-lg lg:text-2xl">{text}</span>
      <NotificationBadge
        count={badgeCount}
        className="ml-auto min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-semibold text-white"
      />
      <LockedBadge
        isLocked={isLocked}
        onClick={onLockClick}
        className="ml-auto text-slate-200 p-2 hover:cursor-pointer"
      />
    </Link>
  );
}

export function SidebarContent({
  availableNavigation,
  isAuth,
  pathname,
  navbarTranslations,
  logout,
  config,
  logoSrc,
  withTourIds,
  onNavClick,
  notificationUnreadCount,
  secretsLocked,
  onSecretsLockClick,
}) {
  return (
    <>
      <div className="flex flex-col items-center p-4 border-b border-green-300">
        <Link href="/" onClick={onNavClick}>
          <Image
            src={logoSrc || ambrosia}
            alt="ambrosia"
            width={160}
            height={160}
            className="object-contain max-h-40"
            style={{ width: "auto", height: "auto" }}
            priority
          />
        </Link>
        <p className="text-slate-100 text-center mt-4">
          {config?.businessName ?? ""}
        </p>
      </div>

      <nav className="p-4 flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {isAuth &&
            availableNavigation.map((item, index) => (
              <NavBarButton
                key={`${item.path}-${index}`}
                id={withTourIds ? item.tourId : undefined}
                text={navbarTranslations(item.label)}
                icon={item.icon}
                href={item.path}
                isActive={pathname === item.path || pathname.startsWith(item.path)}
                badgeCount={item.path === ADMIN_NOTIFICATIONS_ROUTE ? notificationUnreadCount : 0}
                isLocked={item.path === WALLET_ROUTE && secretsLocked}
                onLockClick={onSecretsLockClick}
                onClick={onNavClick}
              />
            ))}
        </ul>
      </nav>

      <div className="mt-auto p-4 border-t border-green-300 text-sm">
        <Link
          href="/auth"
          onClick={() => {
            logout();
            onNavClick?.();
          }}
          className="flex items-center space-x-2 p-2 rounded-md transition-colors text-slate-100 hover:bg-green-300 hover:text-green-800"
        >
          <LogOut className="w-7 h-7 md:w-5 md:h-5 lg:w-7 lg:h-7" />
          <span className="pl-2 text-2xl md:text-lg lg:text-2xl">{navbarTranslations("logout")}</span>
        </Link>
      </div>
    </>
  );
}
