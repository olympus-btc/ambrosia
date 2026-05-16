"use client";

import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { useTranslations } from "next-intl";

export function DataTable({ columns, items, getKey, emptyState }) {
  const t = useTranslations("orders");
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[600px]" removeWrapper aria-label={t("filter.tableAriaLabel")}>
        <TableHeader>
          {columns.map((col) => (
            <TableColumn
              key={col.key}
              className={`py-2 px-3${col.hiddenOn ? ` hidden ${col.hiddenOn}:table-cell` : ""}${col.className ? ` ${col.className}` : ""}`}
            >
              {col.label}
            </TableColumn>
          ))}
        </TableHeader>
        <TableBody emptyContent={emptyState ?? "—"}>
          {items.map((item, i) => (
            <TableRow key={getKey ? getKey(item, i) : String(i)} className="hover:bg-gray-50">
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={col.hiddenOn ? `hidden ${col.hiddenOn}:table-cell` : undefined}
                >
                  {col.render(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
