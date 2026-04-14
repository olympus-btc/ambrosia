"use client";
import { Card, CardBody, CardHeader, Button, Input, Spinner } from "@heroui/react";
import { Calendar, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

export function DateRangeCard({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  onQuickRange,
  onGenerate,
  disabled,
  generating,
}) {
  const t = useTranslations("reports");
  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader>
        <h3 className="text-lg font-bold text-deep flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          {t("dates.title")}
        </h3>
      </CardHeader>
      <CardBody>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button variant="outline" color="primary" size="lg" onPress={() => onQuickRange(0)} className="h-16">
              <div className="flex flex-col items-center">
                <Calendar className="w-5 h-5 mb-1" />
                <span>{t("dates.quick.today")}</span>
              </div>
            </Button>
            <Button variant="outline" color="primary" size="lg" onPress={() => onQuickRange(7)} className="h-16">
              <div className="flex flex-col items-center">
                <Calendar className="w-5 h-5 mb-1" />
                <span>{t("dates.quick.seven")}</span>
              </div>
            </Button>
            <Button variant="outline" color="primary" size="lg" onPress={() => onQuickRange(30)} className="h-16">
              <div className="flex flex-col items-center">
                <Calendar className="w-5 h-5 mb-1" />
                <span>{t("dates.quick.thirty")}</span>
              </div>
            </Button>
            <Button variant="outline" color="secondary" size="lg" onPress={() => onQuickRange(90)} className="h-16">
              <div className="flex flex-col items-center">
                <Calendar className="w-5 h-5 mb-1" />
                <span>{t("dates.quick.ninety")}</span>
              </div>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label={t("dates.startLabel")}
              value={startDate}
              onChange={onChangeStart}
              variant="bordered"
              size="lg"
              startContent={<Calendar className="w-4 h-4 text-gray-400" />}
              classNames={{
                input: "text-base",
                label: "text-sm font-semibold text-deep",
              }}
              disabled={disabled}
            />
            <Input
              type="date"
              label={t("dates.endLabel")}
              value={endDate}
              onChange={onChangeEnd}
              variant="bordered"
              size="lg"
              startContent={<Calendar className="w-4 h-4 text-gray-400" />}
              classNames={{
                input: "text-base",
                label: "text-sm font-semibold text-deep",
              }}
              disabled={disabled}
            />
          </div>

          <Button
            onPress={onGenerate}
            variant="solid"
            color="primary"
            size="lg"
            disabled={disabled || generating}
            className="w-full gradient-forest text-white h-16"
          >
            {generating ? (
              <div className="flex items-center space-x-2">
                <Spinner size="sm" color="white" />
                <span>{t("dates.generating")}</span>
              </div>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                {t("dates.generate")}
              </>
            )}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
