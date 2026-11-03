"use client";

import { Card, CardBody, CardFooter, CardHeader } from "@heroui/react";

import { SecretsGatedRevealButton } from "@components/shared/SecretsGatedRevealButton";

export function PhoenixdRemoteCardLocked({ onReveal, phoenixdRemoteCardTranslations }) {
  return (
    <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {phoenixdRemoteCardTranslations("phoenixdRemoteCard.title")}
        </h2>
      </CardHeader>

      <CardBody>
        <p className="text-sm text-gray-500">
          {phoenixdRemoteCardTranslations("phoenixdRemoteCard.description")}
        </p>
      </CardBody>

      <CardFooter>
        <SecretsGatedRevealButton onReveal={onReveal} revealLabel={phoenixdRemoteCardTranslations("phoenixdRemoteCard.manageButton")} />
      </CardFooter>
    </Card>
  );
}
