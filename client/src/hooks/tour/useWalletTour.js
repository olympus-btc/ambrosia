"use client";

import { useEffect, useRef } from "react";

import { usePathname } from "next/navigation";

import { driver } from "driver.js";
import { useTranslations } from "next-intl";

const WALLET_TOUR_KEY = "ambrosia:tour:wallet-channel";
const WALLET_GUARD_TOUR_KEY = "ambrosia:tour:wallet-guard";
const WALLET_RECEIVE_TOUR_KEY = "ambrosia:tour:wallet-receive";

export function useWalletTour(isAuth) {
  const pathname = usePathname();
  const tTour = useTranslations("walletTour");
  const driverRef = useRef(null);
  const tourStartedRef = useRef(false);

  useEffect(() => {
    if (!pathname.startsWith("/store/wallet")) return;
    localStorage.setItem(WALLET_GUARD_TOUR_KEY, "true");
    localStorage.setItem(WALLET_RECEIVE_TOUR_KEY, "true");
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
  const tourNextButton = tTour("nextButton");
  const tourMobileGoToWallet = tTour("mobileGoToWallet");

  useEffect(() => {
    if (!isAuth || tourStartedRef.current) return;
    if (localStorage.getItem(WALLET_TOUR_KEY)) return;

    tourStartedRef.current = true;
    localStorage.setItem(WALLET_TOUR_KEY, "true");

    const isMobile = window.innerWidth < 768;
    const walletButton = `<br/><br/><a href="/store/wallet" style="display:inline-block;margin-top:4px;padding:8px 16px;background:#166534;color:#fff;border-radius:8px;text-decoration:none;font-size:14px">${tourMobileGoToWallet}</a>`;

    const driverObj = driver({
      allowClose: true,
      overlayOpacity: 0.5,
      nextBtnText: tourNextButton,
      steps: isMobile
        ? [
            {
              popover: {
                title: tourTitle,
                description: `${tourDescription}${walletButton}`,
                showButtons: ["close"],
              },
            },
          ]
        : [
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
  }, [isAuth, tourTitle, tourDescription, tourClickWallet, tourNextButton, tourMobileGoToWallet]);
}
