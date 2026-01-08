"use client";

import { Input, Select, SelectItem, Tabs, Tab } from "@heroui/react";
import { CheckCircle, Search } from "lucide-react";
import { useTranslations } from "next-intl";

export function OrdersFilterBar({
  filter,
  searchTerm,
  rowsPerPage,
  paidCount,
  onSearchChange,
  onRowsPerPageChange,
  onFilterChange,
}) {
  const t = useTranslations("orders");
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          isClearable
          className="flex-1"
          label={t("filter.searchLabel")}
          placeholder={t("filter.searchPlaceholder")}
          startContent={<Search width={20} height={20} />}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange("")}
        />
        <Select
          aria-label="Rows per page"
          label={t("filter.rowsPerPage")}
          selectedKeys={[rowsPerPage.toString()]}
          onSelectionChange={(keys) => onRowsPerPageChange(Array.from(keys)[0])}
          className="w-full md:w-48"
        >
          {[5, 10, 20, 50].map((count) => (
            <SelectItem key={count.toString()} value={count.toString()}>
              {t("filter.rowsOption", { count })}
            </SelectItem>
          ))}
        </Select>
      </div>

      <Tabs
        selectedKey={filter}
        onSelectionChange={onFilterChange}
        variant="underlined"
        classNames={{
          tabList: "gap-6 w-full relative rounded-none p-0",
          cursor: "w-full bg-forest",
          tab: "max-w-fit px-6 py-3 h-12",
          tabContent: "group-data-[selected=true]:text-forest",
        }}
      >
        <Tab
          key="paid"
          title={
            (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>{t("filter.tabPaid")}</span>
                <div className="bg-green-100 text-green-800 rounded-full px-2 py-0.5 text-xs font-medium">
                  {paidCount}
                </div>
              </div>
            )
          }
        />
      </Tabs>
    </div>
  );
}
