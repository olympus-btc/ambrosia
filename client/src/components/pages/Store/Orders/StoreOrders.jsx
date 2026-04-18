"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Card,
  CardBody,
  CardHeader,
  Pagination,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { usePaymentMethods } from "@/components/pages/Store/Cart/hooks/usePaymentMethod";

import { useOrders } from "../hooks/useOrders";

import { OrderDetailsModal } from "./OrderDetailsModal";
import { OrdersFilterBar } from "./OrdersFilterBar";
import { OrdersList } from "./OrdersList";
import { EmptyOrdersState } from "./OrdersList/EmptyOrdersState";

const DEFAULT_FILTERS = {
  startDate: null,
  endDate: null,
  status: null,
  userId: null,
  paymentMethod: null,
  minTotal: null,
  maxTotal: null,
  sortBy: "date",
  sortOrder: "desc",
};

export default function StoreOrders() {
  const t = useTranslations("orders");
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { orders, fetchOrders, fetchOrdersFiltered } = useOrders();
  const { paymentMethods } = usePaymentMethods();
  const { formatAmount } = useCurrency();

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleEditOrder = () => {
    if (!selectedOrder?.id) return;
    router.push(`/modify-order/${selectedOrder.id}`);
    setShowDetails(false);
  };

  const filteredOrders = useMemo(
    () => orders.filter((order) => {
      const normalizedSearch = searchTerm.toLowerCase();
      return (
        searchTerm === "" ||
        order.id.toLowerCase().includes(normalizedSearch) ||
        order.user_name?.toLowerCase().includes(normalizedSearch) ||
        order.table_id?.toLowerCase().includes(normalizedSearch)
      );
    }),
    [orders, searchTerm],
  );

  const handleFiltersChange = (partialFilters) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...partialFilters,
    }));
  };

  const handleApplyFilters = async () => {
    await fetchOrdersFiltered(filters);
    setPage(1);
  };

  const handleClearFilters = async () => {
    setFilters(DEFAULT_FILTERS);
    await fetchOrders();
    setPage(1);
  };

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  return (
    <div className="max-w-7xl mx-auto">
      <Card shadow="none" className="mb-6 shadow-lg bg-white rounded-lg p-4 lg:p-8">
        <CardBody>
          <OrdersFilterBar
            searchTerm={searchTerm}
            rowsPerPage={rowsPerPage}
            filters={filters}
            paymentMethods={paymentMethods}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setPage(1);
            }}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(parseInt(value, 10));
              setPage(1);
            }}
            onFiltersChange={handleFiltersChange}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
          />
        </CardBody>
      </Card>

      <Card shadow="none" className="bg-white rounded-lg shadow-lg p-4 lg:p-8">
        <CardHeader>
          <h3 className="text-lg font-semibold text-green-900">
            {t("header.paid", { count: filteredOrders.length })}
          </h3>
        </CardHeader>
        <CardBody>
          {filteredOrders.length > 0 ? (
            <div className="w-full">
              <OrdersList
                orders={paginatedOrders}
                onViewOrder={handleOrderClick}
              />

              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination
                    total={totalPages}
                    page={page}
                    onChange={setPage}
                    color="primary"
                    showControls
                    showShadow
                  />
                </div>
              )}
            </div>
          ) : (
            <EmptyOrdersState filter="paid" searchTerm={searchTerm} />
          )}
        </CardBody>
      </Card>

      <OrderDetailsModal
        order={selectedOrder}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        onEdit={handleEditOrder}
        formatAmount={formatAmount}
      />
    </div>
  );
}
