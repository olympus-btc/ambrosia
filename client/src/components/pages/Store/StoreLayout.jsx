"use client";

import { useEffect, useRef } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { driver } from "driver.js";
import { LogOut } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useTranslations } from "next-intl";

import { ShiftWidget } from "@/components/turn/ShiftWidget";
import { useModules } from "@hooks/useModules";

import ambrosia from "../../../../public/ambrosia.svg";
import { useConfigurations } from "../../../providers/configurations/configurationsProvider";
import { storedAssetUrl } from "../../utils/storedAssetUrl";

import "driver.js/dist/driver.css";

function Icon({ name, className = "w-5 h-5" }) {
  const formatIconName = (iconName) => (
    iconName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("")
  );
  const formattedName = formatIconName(name);
  const IconComponent = LucideIcons[formattedName] || LucideIcons.FileText;
  return <IconComponent className={className} />;
}

function NavBarButton({ text, icon, href, isActive, id }) {
  return (
    <Link
      id={id}
      href={href}
      className={`flex text-2xl items-center space-x-2 p-2 rounded-md transition-colors  hover:bg-green-300 hover:text-green-800 ${isActive
        ? "bg-green-300 text-green-800"
        : "text-slate-100"
        }`}
    >
      <Icon name={icon} className="w-4 h-4 lg:w-6 lg:h-6" />
      <span className="pl-2 text-lg lg:text-2xl">{text}</span>
    </Link>
  );
}

const WALLET_TOUR_KEY = "ambrosia:tour:wallet-channel";
const WALLET_GUARD_TOUR_KEY = "ambrosia:tour:wallet-guard";
const WALLET_RECEIVE_TOUR_KEY = "ambrosia:tour:wallet-receive";

export function StoreLayout({ children }) {
  const pathname = usePathname();
  const t = useTranslations("navbar");
  const tTour = useTranslations("walletTour");
  const { config } = useConfigurations();
  const { availableNavigation, isAuth, logout } = useModules();
  const logoSrc = storedAssetUrl(config?.businessLogoUrl);
  const driverRef = useRef(null);
  const tourStartedRef = useRef(false);

  useEffect(() => {
    if (!pathname.startsWith("/store/wallet")) return;
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    document.querySelectorAll(".driver-overlay, .driver-popover").forEach((el) => {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    });
    document.body.classList.remove("driver-active");
    document.documentElement.classList.remove("driver-active");
  }, [pathname]);

  const tourTitle = tTour("title");
  const tourDescription = tTour.raw("description");
  const tourClickWallet = tTour("clickWallet");

  useEffect(() => {
    if (!isAuth || tourStartedRef.current) return;
    if (localStorage.getItem(WALLET_TOUR_KEY)) return;

    tourStartedRef.current = true;
    localStorage.setItem(WALLET_TOUR_KEY, "true");

    const driverObj = driver({
      allowClose: true,
      overlayOpacity: 0.5,
      steps: [
        {
          popover: {
            title: tourTitle,
            description: tourDescription,
            showButtons: ["next"],
          },
        },
        {
          element: "#nav-wallet",
          popover: {
            description: tourClickWallet,
            side: "right",
            align: "center",
            showButtons: ["close"],
          },
          onHighlighted: () => {
            localStorage.setItem(WALLET_GUARD_TOUR_KEY, "true");
            localStorage.setItem(WALLET_RECEIVE_TOUR_KEY, "true");
          },
        },
      ],
    });

    driverRef.current = driverObj;
    driverObj.drive();
  }, [isAuth, tourTitle, tourDescription, tourClickWallet]);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-48 lg:w-64 bg-primary-500 flex flex-col">
        <div className="flex flex-col items-center p-4 border-b border-green-300">
          <Link href="/">
            <Image
              src={logoSrc || ambrosia}
              alt="ambrosia"
              width={160}
              height={48}
              className="object-contain"
            />
          </Link>
          <p className=" text-slate-100 text-center mt-4">{config?.businessName ? config.businessName : ""}</p>
        </div>

        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {isAuth && availableNavigation.map((item, index) => (
              <NavBarButton
                key={`${item.path}-${index}`}
                id={item.label === "wallet" ? "nav-wallet" : undefined}
                text={t(item.label)}
                icon={item.icon}
                href={item.path}
                isActive={pathname === item.path || pathname.startsWith(item.path)}
              />
            ))}
          </ul>
        </nav>
        <div className="mt-auto p-4 border-t border-green-300 text-sm">
          <Link
            href="/auth"
            onClick={() => logout()}
            className="flex text-2xl items-center space-x-2 p-2 rounded-md transition-colors text-slate-100 hover:bg-green-300 hover:text-green-800"
          >
            <LogOut className="w-4 h-4 lg:w-7 lg:h-7" />
            <span className="pl-2 text-lg lg:text-2xl">{t("logout")}</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 gradient-fresh p-6 overflow-y-auto">{children}</main>
      <ShiftWidget />
    </div>
  );
}
