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

import { useBitcoinPrice } from "@/components/hooks/useBitcoinPrice";
import { useCurrency } from "@/components/hooks/useCurrency";
import { usePaymentMethods } from "@/components/pages/Store/Cart/hooks/usePaymentMethod";
import { PermissionBlockedMessage } from "@/components/shared/PermissionBlockedMessage";

import { useOrdersFilters } from "./hooks/useOrdersFilters";
import { OrderDetailsModal } from "./OrderDetailsModal";
import { OrdersFilterBar } from "./OrdersFilterBar";
import { OrdersList } from "./OrdersList";
import { EmptyOrdersState } from "./OrdersList/EmptyOrdersState";

export default function StoreOrders() {
  const ordersTranslations = useTranslations("orders");
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const {
    filteredOrders,
    paginatedOrders,
    forbidden: ordersForbidden,
    page,
    setPage,
    totalPages,
    filters,
    fetchOrdersFiltered,
    search,
    pagination,
    onFiltersChange,
    onApplyFilters,
    onClearFilters,
  } = useOrdersFilters();
  const { paymentMethods } = usePaymentMethods();
  const { formatAmount, currency } = useCurrency();
  const { currentRate } = useBitcoinPrice({ currencyAcronym: currency?.acronym });

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleEditOrder = () => {
    if (!selectedOrder?.id) return;
    router.push(`/modify-order/${selectedOrder.id}`);
    setShowDetails(false);
  };

  const handleRefunded = async () => {
    await fetchOrdersFiltered(filters);
    setShowDetails(false);
  };

  if (ordersForbidden) {
    return (
      <div className="max-w-7xl mx-auto">
        <PermissionBlockedMessage
          title={ordersTranslations("permissionBlocked.title")}
          subtitle={ordersTranslations("permissionBlocked.subtitle")}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Card shadow="none" className="mb-6 shadow-lg bg-white rounded-lg p-4 lg:p-8">
        <CardBody>
          <OrdersFilterBar
            search={search}
            pagination={pagination}
            filters={filters}
            paymentMethods={paymentMethods}
            onFiltersChange={onFiltersChange}
            onApplyFilters={onApplyFilters}
            onClearFilters={onClearFilters}
          />
        </CardBody>
      </Card>

      <Card shadow="none" className="bg-white rounded-lg shadow-lg p-4 lg:p-8">
        <CardHeader>
          <h3 className="text-lg font-semibold text-green-900">
            {ordersTranslations("header.paid", { count: filteredOrders.length })}
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

                    aria-label={ordersTranslations("filter.paginationAria")}
                  />
                </div>
              )}
            </div>
          ) : (
            <EmptyOrdersState filter="paid" searchTerm={search.term} />
          )}
        </CardBody>
      </Card>

      <OrderDetailsModal
        order={selectedOrder}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        onEdit={handleEditOrder}
        onRefunded={handleRefunded}
        formatAmount={formatAmount}
        currentRate={currentRate}
      />
    </div>
  );
}
