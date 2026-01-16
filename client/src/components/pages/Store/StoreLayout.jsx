"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Users, Package, ShoppingCart, Settings, LogOut } from 'lucide-react';
import { useTranslations } from "next-intl";
import ambrosia from "../../../../public/ambrosia.svg";
import { useConfigurations } from "../../../providers/configurations/configurationsProvider";
import { useModules } from "../../../hooks/useModules";
import * as LucideIcons from "lucide-react"
import { storedAssetUrl } from "../../utils/storedAssetUrl";

function Icon({ name, className = "w-5 h-5" }) {
  const formatIconName = (iconName) => {
    return iconName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
  };
  const formattedName = formatIconName(name);
  const IconComponent = LucideIcons[formattedName] || LucideIcons.FileText;
  return <IconComponent className={className} />;
}


function NavBarButton({ text, icon, href, isActive }) {
  return (
    <Link
      href={href}
      className={`flex text-2xl items-center space-x-2 p-2 rounded-md transition-colors  hover:bg-green-300 hover:text-green-800 ${isActive
        ? "bg-green-300 text-green-800"
        : "text-slate-100"
        }`}
    >
      <Icon name={icon} className="w-6 h-6" />
      <span className="pl-2">{text}</span>
    </Link>
  );
}

export function StoreLayout({ children }) {
  const pathname = usePathname();
  const t = useTranslations("navbar");
  const { config } = useConfigurations();
  const { availableNavigation, isAuth, logout } =
    useModules();
  const logoSrc = storedAssetUrl(config?.businessLogoUrl);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-primary-500 flex flex-col">
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
            <LogOut className="w-7 h-7" />
            <span className="pl-2">{t("logout")}</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 gradient-fresh p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
