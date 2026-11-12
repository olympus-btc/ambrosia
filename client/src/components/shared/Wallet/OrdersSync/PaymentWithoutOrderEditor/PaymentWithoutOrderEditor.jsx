"use client";
import { useState } from "react";

import { Button, Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { SearchProducts } from "@/components/pages/Store/Cart/SearchProducts";
import { CartItemCard } from "@/components/pages/Store/Cart/Summary/CartItemCard";
import { CopyableValueRow } from "@/components/shared/CopyableValueRow";

import { usePaymentWithoutOrderEditor } from "./hooks/usePaymentWithoutOrderEditor";

export function PaymentWithoutOrderEditor({
  payment,
  products,
  categories,
  currencyAcronym,
  currencyId,
  paymentMethodId,
  userId,
  onConfirmed,
  onCancel,
}) {
  const walletTranslations = useTranslations("wallet");
  const { formatAmount } = useCurrency();
  const [searchTarget, setSearchTarget] = useState(null);
  const {
    resolvedItems,
    unresolvedPurchasedItems,
    isAutoResolving,
    historicalFiatAmountCents,
    currentCatalogTotalCents,
    isConfirming,
    confirmPaymentError,
    canConfirm,
    resolvePurchasedItem,
    discardUnresolvedPurchasedItem,
    addNewItem,
    updateItemQuantity,
    removeItem,
    confirm,
  } = usePaymentWithoutOrderEditor({ payment, products, currencyAcronym, currencyId, paymentMethodId, userId });

  const handleSearchAddProduct = (product, variant) => {
    if (searchTarget?.type === "resolve") {
      resolvePurchasedItem(searchTarget.purchasedItem, product, variant);
    } else {
      addNewItem(product, variant);
    }
    setSearchTarget(null);
  };

  const handleConfirmPayment = async () => {
    const checkoutResult = await confirm().catch(() => null);
    if (checkoutResult) onConfirmed(checkoutResult);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CopyableValueRow
          label={walletTranslations("ordersSync.paymentWithoutOrderEditor.paymentHashLabel")}
          fullValue={payment.paymentHash}
          copyLabel={walletTranslations("ordersSync.paymentWithoutOrderEditor.copy")}
        />
        <p className="text-sm font-medium text-green-900">{payment.receivedSat} sats</p>
      </div>

      {isAutoResolving && (
        <p className="text-sm text-gray-500">
          {walletTranslations("ordersSync.paymentWithoutOrderEditor.autoResolving")}
        </p>
      )}

      {!isAutoResolving && unresolvedPurchasedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-green-900">
            {walletTranslations("ordersSync.paymentWithoutOrderEditor.unresolvedTitle")}
          </p>
          <ul className="space-y-2">
            {unresolvedPurchasedItems.map((purchasedItem, purchasedItemIndex) => (
              <li
                key={`${purchasedItem.name}-${purchasedItemIndex}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-gray-300 p-2"
              >
                <span className="text-sm text-gray-700">
                  {purchasedItem.quantity}x {purchasedItem.name}
                  {purchasedItem.variantName ? ` (${purchasedItem.variantName})` : ""}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="bordered" onPress={() => discardUnresolvedPurchasedItem(purchasedItem)}>
                    {walletTranslations("ordersSync.paymentWithoutOrderEditor.discardButton")}
                  </Button>
                  <Button
                    size="sm"
                    color="primary"
                    className="bg-green-800"
                    onPress={() => setSearchTarget({ type: "resolve", purchasedItem })}
                  >
                    {walletTranslations("ordersSync.paymentWithoutOrderEditor.assignButton")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {resolvedItems.length > 0 && (
        <div className="space-y-2">
          {resolvedItems.map((resolvedItem) => (
            <CartItemCard
              key={resolvedItem.id}
              item={resolvedItem}
              onRemove={() => removeItem(resolvedItem.id)}
              onUpdateQuantity={updateItemQuantity}
            />
          ))}
        </div>
      )}

      <Button color="primary" className="bg-green-800" onPress={() => setSearchTarget({ type: "add" })}>
        {walletTranslations("ordersSync.paymentWithoutOrderEditor.addProductButton")}
      </Button>

      <div className="space-y-1 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {walletTranslations("ordersSync.paymentWithoutOrderEditor.catalogTotalLabel")}
          </span>
          <span className="text-sm text-gray-700">{formatAmount(currentCatalogTotalCents)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-green-900">
            {walletTranslations("ordersSync.paymentWithoutOrderEditor.historicalTotalLabel")}
          </span>
          <span className="text-lg font-bold text-green-900">
            {historicalFiatAmountCents != null ? formatAmount(historicalFiatAmountCents) : "…"}
          </span>
        </div>
      </div>

      {confirmPaymentError && (
        <p className="text-sm text-rose-600">
          {walletTranslations("ordersSync.paymentWithoutOrderEditor.confirmError")}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="bordered"
          type="button"
          className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          isDisabled={isConfirming}
          onPress={onCancel}
        >
          {walletTranslations("ordersSync.paymentWithoutOrderEditor.cancelButton")}
        </Button>
        <Button
          color="primary"
          className="bg-green-800"
          isDisabled={!canConfirm}
          isLoading={isConfirming}
          onPress={handleConfirmPayment}
        >
          {walletTranslations("ordersSync.paymentWithoutOrderEditor.confirmButton")}
        </Button>
      </div>

      <Modal isOpen={Boolean(searchTarget)} onClose={() => setSearchTarget(null)} size="2xl">
        <ModalContent>
          <ModalHeader>{walletTranslations("ordersSync.paymentWithoutOrderEditor.searchTitle")}</ModalHeader>
          <ModalBody className="pb-6">
            <SearchProducts products={products} categories={categories} onAddProduct={handleSearchAddProduct} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
