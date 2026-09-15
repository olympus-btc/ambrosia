"use client";

import { Card, CardBody, CardFooter, CardHeader } from "@heroui/react";

import { SecretsGatedRevealButton } from "@components/shared/SecretsGatedRevealButton";

export function NwcConnectionCardLocked({ onReveal, nwcConnectionTranslations }) {
  return (
    <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {nwcConnectionTranslations("nwcConnection.title")}
        </h2>
      </CardHeader>

      <CardBody>
        <p className="text-sm text-gray-500">
          {nwcConnectionTranslations("nwcConnection.description")}
        </p>
      </CardBody>

      <CardFooter>
        <SecretsGatedRevealButton onReveal={onReveal} revealLabel={nwcConnectionTranslations("nwcConnection.manageButton")} />
      </CardFooter>
    </Card>
  );
}
