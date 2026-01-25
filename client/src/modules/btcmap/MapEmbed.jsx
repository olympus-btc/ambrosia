"use client";
import React, { useState } from "react";
import { StoreLayout } from "@components/pages/Store/StoreLayout";
import { useTranslations } from "next-intl";

export default function MapEmbed() {
  const t = useTranslations("btcmap");
  const [currentView, setCurrentView] = useState("map"); // 'map' or 'add'

  const MAP_URL = "https://btcmap.org/map";
  const ADD_URL = "https://btcmap.org/add-location";

  const toggleView = () => {
    setCurrentView((prev) => (prev === "map" ? "add" : "map"));
  };

  return (
    <StoreLayout>
      <div className="w-full h-[calc(100vh-4rem)] flex flex-col bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-white p-4 border-b border-gray-200 shrink-0 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{t("title")}</h1>
            <p className="text-sm text-gray-500">
              {currentView === "map"
                ? t("description")
                : t("addDescription")}
            </p>
          </div>
          <button
            onClick={toggleView}
            className={`font-medium py-2 px-4 rounded-md transition-colors text-sm ${
              currentView === "map"
                ? "bg-primary-500 hover:bg-primary-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
            }`}
          >
            {currentView === "map" ? t("addButton") : t("backButton")}
          </button>
        </div>
        <div className="flex-1 w-full relative min-h-0">
          <iframe
            src={currentView === "map" ? MAP_URL : ADD_URL}
            title={t("title")}
            className="absolute inset-0 w-full h-full border-0"
            allow="geolocation"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </StoreLayout>
  );
}