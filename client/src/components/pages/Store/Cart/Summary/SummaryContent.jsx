import { useSyncExternalStore } from "react";

import { addToast, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { CartItemCard } from "./CartItemCard";
import { CartPaymentSection } from "./CartPaymentSection";
import { CartTotals } from "./CartTotals";
import { usePendingRemoval } from "./hooks/usePendingRemoval";
import { SwipeableCartItem } from "./SwipeableCartItem";

export function SummaryContent({
  cartItems,
  discount,
  onRemoveProduct,
  onUpdateQuantity,
  onPay,
  isPaying,
  paymentError,
  onClearPaymentError,
}) {
  const cartTranslations = useTranslations("cart");
  const { pendingRemovals, startRemoval, cancelRemoval } = usePendingRemoval();
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const isTouchDevice = useSyncExternalStore(() => () => {}, () => navigator.maxTouchPoints > 0, () => false);
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
          {cartTranslations("summary.undoToast.undo")}
        </Button>
      ),
    });
  };

  return (
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
        isDisabled={!isMounted || !visibleItems.length}
        paymentError={paymentError}
        onClearPaymentError={onClearPaymentError}
        onPay={(selectedPaymentMethod) => {
          onClearPaymentError?.();
          onPay?.({ items, subtotal, discount, discountAmount, total, selectedPaymentMethod });
        }}
      />
    </div>
  );
}
