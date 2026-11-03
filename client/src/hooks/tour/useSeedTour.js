"use client";

import { useEffect, useRef } from "react";

import { usePathname } from "next/navigation";

import { driver } from "driver.js";
import { useTranslations } from "next-intl";

const SEED_TOUR_KEY = "ambrosia:tour:seed";
const SEED_SETTINGS_TOUR_KEY = "ambrosia:tour:seed-settings";

export function useSeedTour({ isAuth, homeRoute, settingsRoute }) {
  const pathname = usePathname();
  const tTour = useTranslations("seedTour");
  const driverRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (pathname === homeRoute && !localStorage.getItem(SEED_TOUR_KEY)) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [pathname, homeRoute]);

  useEffect(() => {
    if (pathname === homeRoute) return;
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, [pathname, homeRoute]);

  const tourTitle = tTour("title");
  const tourDescription = tTour.raw("description");
  const tourClickSettings = tTour("clickSettings");
  const tourNextButton = tTour("nextButton");
  const tourMobileGoToSettings = tTour("mobileGoToSettings");

  useEffect(() => {
    if (!isAuth || timerRef.current) return;
    if (localStorage.getItem(SEED_TOUR_KEY)) return;
    if (pathname !== homeRoute) return;

    const isMobile = window.innerWidth < 768;
    const settingsLink = `<br/><br/><a href="${settingsRoute}" style="display:inline-block;margin-top:4px;padding:8px 16px;background:#166534;color:#fff;border-radius:8px;text-decoration:none;font-size:14px">${tourMobileGoToSettings}</a>`;

    const driverObj = driver({
      allowClose: true,
      overlayOpacity: 0.5,
      nextBtnText: tourNextButton,
      ...(isMobile && {
        onDestroyStarted: () => {
          driverObj.destroy();
        },
      }),
      steps: isMobile
        ? [
            {
              popover: {
                title: tourTitle,
                description: `${tourDescription}${settingsLink}`,
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
              element: "#nav-settings",
              popover: {
                description: tourClickSettings,
                side: "right",
                align: "center",
                showButtons: ["close"],
              },
              onHighlighted: () => {
                localStorage.setItem(SEED_SETTINGS_TOUR_KEY, "true");
              },
            },
          ],
    });

    driverRef.current = driverObj;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      localStorage.setItem(SEED_TOUR_KEY, "true");
      if (isMobile) localStorage.setItem(SEED_SETTINGS_TOUR_KEY, "true");
      driverObj.drive();
    }, 800);
  }, [isAuth, pathname, homeRoute, settingsRoute, tourTitle, tourDescription, tourClickSettings, tourNextButton, tourMobileGoToSettings]);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
}
