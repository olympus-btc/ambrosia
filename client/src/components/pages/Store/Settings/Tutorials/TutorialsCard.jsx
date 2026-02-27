"use client";

import { useState } from "react";

import { Button, Card, CardBody, CardHeader, Chip } from "@heroui/react";

const WALLET_TOUR_KEY = "ambrosia:tour:wallet-channel";
const WALLET_GUARD_TOUR_KEY = "ambrosia:tour:wallet-guard";
const WALLET_RECEIVE_TOUR_KEY = "ambrosia:tour:wallet-receive";

export function TutorialsCard({ t, onNavigate = (url) => window.location.assign(url) }) {
  const [walletTourSeen] = useState(
    () => typeof window !== "undefined" && Boolean(localStorage.getItem(WALLET_TOUR_KEY)),
  );

  const handleResetWalletTour = () => {
    localStorage.removeItem(WALLET_TOUR_KEY);
    localStorage.removeItem(WALLET_GUARD_TOUR_KEY);
    localStorage.removeItem(WALLET_RECEIVE_TOUR_KEY);
    onNavigate("/store");
  };

  return (
    <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start">
        <h2 className="text-2xl font-semibold text-green-900">
          {t("cardTours.title")}
        </h2>
      </CardHeader>

      <CardBody>
        <div className="flex flex-col max-w-2xl space-y-2">
          <p className="text-sm text-gray-500 mb-2">{t("cardTours.subtitle")}</p>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-700">
                {t("cardTours.walletTour.name")}
              </div>
              <div className="text-sm text-gray-500">
                {t("cardTours.walletTour.description")}
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4 shrink-0">
              <Chip
                className={walletTourSeen ? "bg-green-200 text-xs text-green-800 border border-green-300" : "bg-amber-100 text-amber-800 border border-amber-200"}
                size="sm"
                variant="flat"
              >
                {walletTourSeen ? t("cardTours.seen") : t("cardTours.pending")}
              </Chip>
              <Button
                color="primary"
                className="bg-green-800"
                onPress={handleResetWalletTour}
              >
                {t("cardTours.replayButton")}
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
