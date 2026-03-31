"use client";

import { useState } from "react";

import { usePathname } from "next/navigation";

import { useTranslations } from "next-intl";

import { ShiftWidget } from "@/components/turn/ShiftWidget";
import { useWalletTour } from "@/hooks/tour/useWalletTour";
import { storedAssetUrl } from "@components/utils/storedAssetUrl";
import { useModules } from "@hooks/useModules";
import { useConfigurations } from "@providers/configurations/configurationsProvider";

import { BottomNav } from "./BottomNav";
import { MobileDrawer } from "./MobileDrawer";
import { SidebarContent } from "./Sidebar";

export function StoreLayout({ children }) {
  const pathname = usePathname();
  const t = useTranslations("navbar");
  const { config } = useConfigurations();
  const { availableNavigation, isAuth, logout } = useModules();
  const logoSrc = storedAssetUrl(config?.businessLogoUrl);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useWalletTour(isAuth);

  const bottomNavItems = availableNavigation
    .filter((item) => item.showInBottomNav)
    .sort((a, b) => a.bottomNavOrder - b.bottomNavOrder);

  const sidebarProps = {
    availableNavigation,
    isAuth,
    pathname,
    t,
    logout,
    config,
    logoSrc,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside data-testid="desktop-sidebar" className="hidden md:flex md:w-48 lg:w-64 bg-primary-500 flex-col">
        <SidebarContent {...sidebarProps} withTourIds />
      </aside>

      <div className="md:hidden">
        <MobileDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sidebarProps={sidebarProps}
        />
      </div>

      <main className="flex-1 gradient-fresh overflow-y-auto pb-32 md:pb-0">
        <div className="p-6">
          {children}
        </div>
      </main>

      <BottomNav
        isAuth={isAuth}
        items={bottomNavItems}
        pathname={pathname}
        t={t}
        onMenuClick={() => setDrawerOpen(true)}
      />

      <ShiftWidget />
    </div>
  );
}
