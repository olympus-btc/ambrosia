"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import {
  Card,
  CardBody,
  CardHeader,
  Pagination,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

import { useOrders } from "../hooks/useOrders";

import { EmptyOrdersState } from "./EmptyOrdersState";
import { OrderDetailsModal } from "./OrderDetailsModal";
import { OrdersFilterBar } from "./OrdersFilterBar";
import { OrdersTable } from "./OrdersTable";

export default function StoreOrders() {
  const t = useTranslations("orders");
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const { orders } = useOrders();
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

  const filteredOrders = orders.filter((order) => {
    const searchMatch =
      searchTerm === "" ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.waiter?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.table_id?.toLowerCase().includes(searchTerm.toLowerCase());

    return searchMatch;
  });

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
            onSearchChange={(value) => {
              setSearchTerm(value);
              setPage(1);
            }}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(parseInt(value, 10));
              setPage(1);
            }}
            onFilterChange={(value) => setFilter(String(value))}
          />
        </CardBody>
      </Card>

      <Card shadow="none" className="bg-white rounded-lg shadow-lg p-4 lg:p-8 overflow-x-auto">
        <CardHeader>
          <h3 className="text-lg font-semibold text-green-900">
            {t("header.paid", { count: filteredOrders.length })}
          </h3>
        </CardHeader>
        <CardBody>
          {filteredOrders.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <OrdersTable
                orders={paginatedOrders}
                formatAmount={formatAmount}
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
