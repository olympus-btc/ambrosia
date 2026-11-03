"use client";

import { Card, CardBody, CardFooter, CardHeader } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

import { SecretsGatedRevealButton } from "@components/shared/SecretsGatedRevealButton";

export function SeedCardLocked({ onReveal, seedCardTranslations }) {
  return (
    <Card id="settings-seed-card" shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {seedCardTranslations("cardSeed.title")}
        </h2>
      </CardHeader>

      <CardBody>
        <div className="flex flex-col max-w-2xl space-y-4">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              {seedCardTranslations("cardSeed.warning")}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            {seedCardTranslations("cardSeed.description")}
          </p>
        </div>
      </CardBody>

      <CardFooter>
        <SecretsGatedRevealButton onReveal={onReveal} revealLabel={seedCardTranslations("cardSeed.revealButton")} />
      </CardFooter>
    </Card>
  );
}
