"use client";
import { Button, Card, CardHeader } from "@heroui/react";
import { BarChart3, Home, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

export function ReportsHeader({ onBack, onRefresh, loading }) {
  const t = useTranslations("reports");
  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onPress={onBack} className="text-forest hover:bg-mint/20">
            <Home className="w-5 h-5 mr-2" />
            {t("header.back")}
          </Button>
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-deep">{t("header.title")}</h1>
            <p className="text-forest text-sm">{t("header.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button
              isIconOnly
              variant="flat"
              onPress={onRefresh}
              disabled={loading}
              aria-label={t("header.refreshAria")}
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
