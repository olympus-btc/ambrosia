"use client";

import { Input, Select, SelectItem } from "@heroui/react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

export function OrdersFilterBar({
  searchTerm,
  rowsPerPage,
  onSearchChange,
  onRowsPerPageChange,
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
    </div>
  );
}
