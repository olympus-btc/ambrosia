"use client";

import Link from "next/link";

import { Menu } from "lucide-react";

import { NavIcon } from "./NavIcon";

export function BottomNav({ isAuth, items, pathname, t, onMenuClick }) {
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
        <span className="text-[10px] leading-none">{t("menu")}</span>
      </button>

      {isAuth && items.map((item, index) => {
        const isActive = pathname === item.path || pathname.startsWith(item.path);
        return (
          <Link
            key={`${item.path}-${index}`}
            href={item.path}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition-all ${
              isActive
                ? "bg-green-300 text-green-800"
                : "text-slate-100 hover:bg-green-300 hover:text-green-800"
            }`}
          >
            <NavIcon name={item.icon} className="w-5 h-5" />
            <span className={`text-[10px] leading-none ${isActive ? "font-semibold" : ""}`}>
              {t(item.label)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
