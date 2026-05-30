"use client";
import { useMemo, useState } from "react";

import { Button, Card, CardBody, Pagination, Select, SelectItem } from "@heroui/react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { useMediaQuery } from "../hooks/useMediaQuery";
import { useOrdersDetailData } from "../hooks/useOrdersDetailData";

import { OrdersFilters } from "./OrdersFilters";
import { ReportsOrdersList } from "./OrdersList";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export function OrdersDetailCard({ orders, formatCurrency, disabled }) {
  const reportsTranslations = useTranslations("reports");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const filteredOrders = useMemo(() => {
    const term = search.toLowerCase();
    return orders.filter((order) => {
      const searchMatch = !search || (
        order.shortId?.toLowerCase().includes(term) ||
        order.userName?.toLowerCase().includes(term) ||
        order.paymentMethod?.toLowerCase().includes(term) ||
        String(order.total).includes(term) ||
        order.items.some((item) => item.productName?.toLowerCase().includes(term))
      );
      const methodMatch = !paymentMethod || order.paymentMethod === paymentMethod;
      return searchMatch && methodMatch;
    });
  }, [orders, search, paymentMethod]);

  const isMobile = useMediaQuery("(max-width: 639px)");
  const { paginatedOrders, totalPages, page, setPage, rowsPerPage, handleRowsPerPageChange, exportToCsv } =
    useOrdersDetailData(filteredOrders, formatCurrency);

  return (
    <Card shadow="none" className="shadow-lg bg-white rounded-lg p-4 lg:p-8">
      <CardBody className="space-y-4">

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-lg">
            {reportsTranslations("orders.title")}
            <span className="ml-2 text-sm font-normal text-default-400">
              ({filteredOrders.length} {reportsTranslations("sales.records")})
            </span>
          </h2>
          <Button
            variant="bordered"
            size="sm"
            className="border border-green-800 text-green-800"
            startContent={<Download aria-hidden="true" className="w-3.5 h-3.5" />}
            isDisabled={!orders.length}
            onPress={exportToCsv}
          >
            {reportsTranslations("sales.export")}
          </Button>
        </div>

        <OrdersFilters
          search={search}
          onSearchChange={setSearch}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          disabled={disabled}
          orders={orders}
        />

        <ReportsOrdersList orders={paginatedOrders} formatCurrency={formatCurrency} />

        <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-default-100">
          <div className="flex items-center gap-2 text-sm text-default-500">
            <span>{reportsTranslations("sales.show")}</span>
            <Select
              aria-label={reportsTranslations("sales.rowsPerPage")}
              size="sm"
              variant="bordered"
              className="w-20"
              classNames={{ trigger: "h-7 min-h-7 py-0", value: "text-sm translate-y-0" }}
              selectedKeys={new Set([String(rowsPerPage)])}
              onSelectionChange={(keys) => {
                const selectedKey = [...keys][0];
                if (selectedKey) handleRowsPerPageChange(Number(selectedKey));
              }}
            >
              {ROWS_PER_PAGE_OPTIONS.map((size) => (
                <SelectItem key={String(size)}>{String(size)}</SelectItem>
              ))}
            </Select>
            <span>{reportsTranslations("sales.perPage")}</span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 sm:gap-3">
              <span className="hidden sm:inline text-sm text-default-500">
                {reportsTranslations("sales.pageLabel")} {page} {reportsTranslations("sales.ofLabel")} {totalPages}
              </span>
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                color="primary"
                showControls
                size="sm"
                siblings={isMobile ? 0 : 1}
                boundaries={1}
                aria-label={reportsTranslations("orders.paginationAria")}
              />
            </div>
          )}
        </div>

      </CardBody>
    </Card>
  );
}
