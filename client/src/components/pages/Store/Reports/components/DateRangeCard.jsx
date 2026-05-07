"use client";
import { Button, Card, CardBody, CardHeader, Input, Select, SelectItem } from "@heroui/react";
import { Bitcoin, Banknote, CreditCard, Calendar, Search } from "lucide-react";
import { useTranslations } from "next-intl";

const PERIODS = ["week", "month", "year"];

const PAYMENT_OPTIONS = [
  { key: "all", localeKey: "all", icon: <Search className="w-4 h-4" /> },
  { key: "Cash", localeKey: "cash", icon: <Banknote className="w-4 h-4" /> },
  { key: "BTC", localeKey: "btc", icon: <Bitcoin className="w-4 h-4" /> },
  { key: "Debit Card", localeKey: "debitCard", icon: <CreditCard className="w-4 h-4" /> },
  { key: "Credit Card", localeKey: "creditCard", icon: <CreditCard className="w-4 h-4" /> },
];

export function DateRangeCard({ filters, onFiltersChange, disabled }) {
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

  const handlePaymentMethod = (keys) => {
    const key = Array.from(keys)[0] ?? "all";
    onFiltersChange({ paymentMethod: key === "all" ? "" : key });
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
            <Select
              label={t("filters.paymentMethod")}
              selectedKeys={new Set([filters.paymentMethod || "all"])}
              onSelectionChange={handlePaymentMethod}
              variant="bordered"
              size="lg"
              classNames={{ label: "text-sm font-semibold text-deep" }}
              isDisabled={disabled}
            >
              {PAYMENT_OPTIONS.map(({ key, localeKey, icon }) => (
                <SelectItem key={key} startContent={icon}>
                  {t(`filters.paymentMethods.${localeKey}`)}
                </SelectItem>
              ))}
            </Select>
          </div>

        </div>
      </CardBody>
    </Card>
  );
}
