"use client";
import { Button, Card, CardBody, CardHeader, Input, Spinner } from "@heroui/react";
import { Calendar, FileText, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

const PERIODS = ["week", "month", "year"];

export function DateRangeCard({ filters, onFiltersChange, onClearFilters, onGenerate, disabled, generating }) {
  const t = useTranslations("reports");

  const handlePeriod = (p) => {
    onFiltersChange({ activePeriod: p, startDate: "", endDate: "" });
  };

  const handleChangeStart = (e) => {
    onFiltersChange({ startDate: e.target.value, activePeriod: null });
  };

  const handleChangeEnd = (e) => {
    onFiltersChange({ endDate: e.target.value, activePeriod: null });
  };

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
          {/* Period quick buttons */}
          <div className="grid grid-cols-3 gap-3">
            {PERIODS.map((p) => (
              <Button
                key={p}
                variant={filters.activePeriod === p ? "solid" : "bordered"}
                color="primary"
                size="lg"
                onPress={() => handlePeriod(p)}
                disabled={disabled}
                className={filters.activePeriod === p ? "gradient-forest text-white" : ""}
              >
                <div className="flex flex-col items-center">
                  <Calendar className="w-4 h-4 mb-1" />
                  <span>{t(`dates.period.${p}`)}</span>
                </div>
              </Button>
            ))}
          </div>

          {/* Custom date range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label={t("dates.startLabel")}
              value={filters.startDate}
              onChange={handleChangeStart}
              variant="bordered"
              size="lg"
              startContent={<Calendar className="w-4 h-4 text-gray-400" />}
              classNames={{ input: "text-base", label: "text-sm font-semibold text-deep" }}
              disabled={disabled}
            />
            <Input
              type="date"
              label={t("dates.endLabel")}
              value={filters.endDate}
              onChange={handleChangeEnd}
              variant="bordered"
              size="lg"
              startContent={<Calendar className="w-4 h-4 text-gray-400" />}
              classNames={{ input: "text-base", label: "text-sm font-semibold text-deep" }}
              disabled={disabled}
            />
          </div>

          {/* Text filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("filters.productName")}
              placeholder={t("filters.productNamePlaceholder")}
              value={filters.productName}
              onChange={(e) => onFiltersChange({ productName: e.target.value })}
              variant="bordered"
              size="lg"
              startContent={<Search className="w-4 h-4 text-gray-400" />}
              classNames={{ label: "text-sm font-semibold text-deep" }}
              disabled={disabled}
            />
            <Input
              label={t("filters.paymentMethod")}
              placeholder={t("filters.paymentMethodPlaceholder")}
              value={filters.paymentMethod}
              onChange={(e) => onFiltersChange({ paymentMethod: e.target.value })}
              variant="bordered"
              size="lg"
              startContent={<Search className="w-4 h-4 text-gray-400" />}
              classNames={{ label: "text-sm font-semibold text-deep" }}
              disabled={disabled}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onPress={onGenerate}
              variant="solid"
              color="primary"
              size="lg"
              disabled={disabled || generating}
              className="flex-1 gradient-forest text-white h-14"
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
            <Button
              onPress={onClearFilters}
              variant="bordered"
              color="default"
              size="lg"
              disabled={disabled || generating}
              className="h-14"
              aria-label={t("filters.clear")}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
