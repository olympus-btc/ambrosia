"use client";

import Image from "next/image";
import Link from "next/link";

import { LogOut } from "lucide-react";

import ambrosia from "../../../../../public/ambrosia.svg";

import { NavIcon } from "./NavIcon";

function NavBarButton({ text, icon, href, isActive, id, onClick }) {
  return (
    <Link
      id={id}
      href={href}
      onClick={onClick}
      className={`flex text-2xl items-center space-x-2 p-2 rounded-md transition-colors hover:bg-green-300 hover:text-green-800 ${
        isActive ? "bg-green-300 text-green-800" : "text-slate-100"
      }`}
    >
      <NavIcon name={icon} className="w-6 h-6" />
      <span className="pl-2 text-2xl">{text}</span>
    </Link>
  );
}

export function SidebarContent({
  availableNavigation,
  isAuth,
  pathname,
  t,
  logout,
  config,
  logoSrc,
  withTourIds,
  onNavClick,
}) {
  return (
    <>
      <div className="flex flex-col items-center p-4 border-b border-green-300">
        <Link href="/" onClick={onNavClick}>
          <Image
            src={logoSrc || ambrosia}
            alt="ambrosia"
            width={160}
            height={48}
            className="object-contain"
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
                id={withTourIds && item.label === "wallet" ? "nav-wallet" : undefined}
                text={t(item.label)}
                icon={item.icon}
                href={item.path}
                isActive={pathname === item.path || pathname.startsWith(item.path)}
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
          className="flex text-2xl items-center space-x-2 p-2 rounded-md transition-colors text-slate-100 hover:bg-green-300 hover:text-green-800"
        >
          <LogOut className="w-7 h-7" />
          <span className="pl-2 text-2xl">{t("logout")}</span>
        </Link>
      </div>
    </>
  );
}
