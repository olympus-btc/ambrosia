import { useState } from "react";

import { addToast, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { BitcoinPaymentModal } from "../BitcoinPaymentModal";
import { CardPaymentModal } from "../CardPaymentModal";
import { CashPaymentModal } from "../CashPaymentModal";

import { CartItemCard } from "./CartItemCard";
import { CartPaymentSection } from "./CartPaymentSection";
import { CartTotals } from "./CartTotals";
import { usePendingRemoval } from "./hooks/usePendingRemoval";
import { SwipeableCartItem } from "./SwipeableCartItem";

export function SummaryContent({
  cartItems,
  discount,
  hydrated,
  onRemoveProduct,
  onUpdateQuantity,
  onPay,
  isPaying,
  paymentError,
  onClearPaymentError,
  btcPayment,
  cashPayment,
  cardPayment,
}) {
  const translateCart = useTranslations("cart");
  const { pendingRemovals, startRemoval, cancelRemoval } = usePendingRemoval();
  const [isTouchDevice] = useState(
    () => typeof window !== "undefined" && navigator.maxTouchPoints > 0,
  );
  const items = cartItems || [];
  const visibleItems = items.filter((item) => !pendingRemovals.has(item.id));

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = (subtotal * (Number(discount) || 0)) / 100;
  const total = subtotal - discountAmount;

  const handleStartRemoval = (item) => {
    startRemoval(item.id, () => onRemoveProduct(item.id));
    addToast({
      description: item.name,
      timeout: 5000,
      endContent: (
        <Button
          size="sm"
          color="primary"
          className="bg-green-800"
          onPress={() => cancelRemoval(item.id)}
        >
          {translateCart("summary.undoToast.undo")}
        </Button>
      ),
    });
  };

  return (
    <>
      <div className="space-y-4">
        {visibleItems.map((item) => (
          <SwipeableCartItem
            key={item.id}
            onRemove={() => handleStartRemoval(item)}
            isTouchDevice={isTouchDevice}
          >
            <CartItemCard
              item={item}
              onRemove={() => handleStartRemoval(item)}
              onUpdateQuantity={onUpdateQuantity}
            />
          </SwipeableCartItem>
        ))}

        <CartTotals subtotal={subtotal} discountAmount={discountAmount} total={total} />

        <CartPaymentSection
          isPaying={isPaying}
          isDisabled={!hydrated || !visibleItems.length}
          paymentError={paymentError}
          onClearPaymentError={onClearPaymentError}
          onPay={(selectedPaymentMethod) => {
            onClearPaymentError?.();
            onPay?.({ items, subtotal, discount, discountAmount, total, selectedPaymentMethod });
          }}
        />
      </div>

      <BitcoinPaymentModal
        isOpen={!!btcPayment?.config}
        amountFiat={btcPayment?.config?.amountFiat}
        currencyAcronym={btcPayment?.config?.currencyAcronym}
        paymentId={btcPayment?.config?.paymentId}
        invoiceDescription={btcPayment?.config?.invoiceDescription}
        displayTotal={btcPayment?.config?.displayTotal}
        onClose={btcPayment?.onClose}
        onInvoiceReady={btcPayment?.onInvoiceReady}
        onComplete={btcPayment?.onComplete}
      />

      <CashPaymentModal
        isOpen={!!cashPayment?.config}
        amountDue={cashPayment?.config?.amountDue}
        displayTotal={cashPayment?.config?.displayTotal}
        onClose={cashPayment?.onClose}
        onComplete={cashPayment?.onComplete}
      />

      <CardPaymentModal
        isOpen={!!cardPayment?.config}
        amountDue={cardPayment?.config?.amountDue}
        displayTotal={cardPayment?.config?.displayTotal}
        methodLabel={cardPayment?.config?.methodLabel}
        onClose={cardPayment?.onClose}
        onComplete={cardPayment?.onComplete}
      />
    </>
  );
}
