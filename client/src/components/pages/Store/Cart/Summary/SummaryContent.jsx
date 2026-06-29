import { useSyncExternalStore } from "react";

import { addToast, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { calculateCartTotals } from "../utils/cartTotals";

import { CartItemCard } from "./CartItemCard";
import { CartPaymentSection } from "./CartPaymentSection";
import { CartTotals } from "./CartTotals";
import { SwipeableCartItem } from "./SwipeableCartItem";

export function SummaryContent({
  cartItems,
  discount,
  discountType,
  onApplyDiscount,
  onRemoveProduct,
  onUpdateQuantity,
  startRemoval,
  cancelRemoval,
  onPay,
  isPaying,
  paymentError,
  onClearPaymentError,
}) {
  const cartTranslations = useTranslations("cart");
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const isTouchDevice = useSyncExternalStore(() => () => {}, () => navigator.maxTouchPoints > 0, () => false);
  const visibleItems = cartItems || [];

  const { subtotal, discountAmount, total } = calculateCartTotals(visibleItems, discount, discountType);

  const handleStartRemoval = (item) => {
    const toastKey = addToast({
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
    startRemoval(item.id, () => onRemoveProduct(item.id), toastKey);
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

      {visibleItems.length > 0 && (
        <CartTotals
          subtotal={subtotal}
          discountAmount={discountAmount}
          discount={discount}
          discountType={discountType}
          onApplyDiscount={onApplyDiscount}
        />
      )}

      <CartPaymentSection
        isPaying={isPaying}
        isDisabled={!isMounted || !visibleItems.length}
        paymentError={paymentError}
        onClearPaymentError={onClearPaymentError}
        onPay={(selectedPaymentMethod) => {
          onClearPaymentError?.();
          onPay?.({ items: visibleItems, subtotal, discount, discountAmount, total, selectedPaymentMethod });
        }}
      />
    </div>
  );
}
