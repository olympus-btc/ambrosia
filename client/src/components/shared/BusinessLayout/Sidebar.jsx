"use client";

import Image from "next/image";
import Link from "next/link";

import { LogOut } from "lucide-react";

import { LockedBadge } from "./LockedBadge";
import { NavIcon } from "./NavIcon";
import { NotificationBadge } from "./NotificationBadge";

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
  badgeCountsByPath = {},
  lockedPaths = [],
  onLockedClick,
}) {
  return (
    <>
      <div className="flex flex-col items-center p-4 border-b border-green-300">
        <Link href="/" onClick={onNavClick}>
          <Image
            src={logoSrc || "/ambrosia.svg"}
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
            availableNavigation.map((navigationItem, navigationItemIndex) => (
              <NavBarButton
                key={`${navigationItem.path}-${navigationItemIndex}`}
                id={withTourIds ? navigationItem.tourId : undefined}
                text={navbarTranslations(navigationItem.label)}
                icon={navigationItem.icon}
                href={navigationItem.path}
                isActive={pathname === navigationItem.path || pathname.startsWith(navigationItem.path)}
                badgeCount={badgeCountsByPath[navigationItem.path] ?? 0}
                isLocked={lockedPaths.includes(navigationItem.path)}
                onLockClick={onLockedClick}
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
