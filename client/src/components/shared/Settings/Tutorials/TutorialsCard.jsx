"use client";

import { Button, Card, CardBody, CardHeader, Chip } from "@heroui/react";

function TourRow({ tourName, tourDescription, isSeen, onReplay, settingsTranslations }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-sm sm:text-base font-semibold text-gray-700">{tourName}</div>
        <div className="text-xs sm:text-sm text-gray-500">{tourDescription}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Chip
          className={isSeen ? "bg-green-200 text-xs text-green-800 border border-green-300" : "bg-amber-100 text-amber-800 border border-amber-200"}
          size="sm"
          variant="flat"
        >
          {isSeen ? settingsTranslations("cardTours.seen") : settingsTranslations("cardTours.pending")}
        </Chip>
        <Button
          color="primary"
          className="bg-green-800 h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium"
          onPress={onReplay}
        >
          {settingsTranslations("cardTours.replayButton")}
        </Button>
      </div>
    </div>
  );
}

export function TutorialsCard({ tutorialTours, settingsTranslations }) {
  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {settingsTranslations("cardTours.title")}
        </h2>
      </CardHeader>

      <CardBody>
        <div className="flex flex-col max-w-2xl space-y-2">
          <p className="text-sm text-gray-500 mb-2">{settingsTranslations("cardTours.subtitle")}</p>
          <div className="flex flex-col gap-6">
            {tutorialTours.map((tutorialTour) => (
              <TourRow
                key={tutorialTour.tourName}
                tourName={settingsTranslations(`cardTours.${tutorialTour.translationKey}.name`)}
                tourDescription={settingsTranslations(`cardTours.${tutorialTour.translationKey}.description`)}
                isSeen={tutorialTour.isSeen}
                onReplay={tutorialTour.onReplay}
                settingsTranslations={settingsTranslations}
              />
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
