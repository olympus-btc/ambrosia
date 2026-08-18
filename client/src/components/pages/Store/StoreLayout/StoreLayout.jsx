"use client";

import { useState } from "react";

import { usePathname } from "next/navigation";

import { useLocale, useTranslations } from "next-intl";

import { ShiftWidget } from "@/components/turn/ShiftWidget";
import { useSeedTour } from "@/hooks/tour/useSeedTour";
import { useWalletTour } from "@/hooks/tour/useWalletTour";
import { storedAssetUrl } from "@components/utils/storedAssetUrl";
import { useNavigation } from "@hooks/useNavigation";
import { useConfigurations } from "@providers/configurations/configurationsProvider";

import { BottomNav } from "./BottomNav";
import { useAdminNotificationSignals } from "./hooks/useAdminNotificationSignals";
import { MobileDrawer } from "./MobileDrawer";
import { SidebarContent } from "./Sidebar";

export function StoreLayout({ children }) {
  const pathname = usePathname();
  const locale = useLocale();
  const navbarTranslations = useTranslations("navbar");
  const notificationsTranslations = useTranslations("notifications");
  const { config } = useConfigurations();
  const { availableNavigation, isAuth, isAdmin, logout } = useNavigation();
  const logoSrc = storedAssetUrl(config?.businessLogoUrl);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { notificationUnreadCount } = useAdminNotificationSignals({
    enabled: isAuth && isAdmin,
    locale,
    pathname,
    notificationsTranslations,
  });

  useSeedTour(isAuth);
  useWalletTour(isAuth);

  const bottomNavItems = availableNavigation
    .filter((item) => item.showInBottomNav)
    .sort((a, b) => a.bottomNavOrder - b.bottomNavOrder);

  const sidebarProps = {
    availableNavigation,
    isAuth,
    pathname,
    navbarTranslations,
    logout,
    config,
    logoSrc,
    notificationUnreadCount,
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
        navbarTranslations={navbarTranslations}
        notificationUnreadCount={notificationUnreadCount}
        onMenuClick={() => setDrawerOpen(true)}
      />

      <ShiftWidget />
    </div>
  );
}
