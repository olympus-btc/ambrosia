"use client";

import { Button, Card, CardBody, CardFooter, CardHeader } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

export function SeedCardLocked({ onReveal, t }) {
  return (
    <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start">
        <h2 className="text-2xl font-semibold text-green-900">
          {t("cardSeed.title")}
        </h2>
      </CardHeader>

      <CardBody>
        <div className="flex flex-col max-w-2xl space-y-4">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              {t("cardSeed.warning")}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            {t("cardSeed.description")}
          </p>
        </div>
      </CardBody>

      <CardFooter>
        <Button
          color="primary"
          className="bg-green-800"
          onPress={onReveal}
        >
          {t("cardSeed.revealButton")}
        </Button>
      </CardFooter>
    </Card>
  );
}
