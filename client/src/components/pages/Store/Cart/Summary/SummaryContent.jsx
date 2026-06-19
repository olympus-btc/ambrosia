import { useRef, useSyncExternalStore } from "react";

import { addToast, Button, closeToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { BitcoinPaymentModal } from "../BitcoinPaymentModal";
import { CardPaymentModal } from "../CardPaymentModal";
import { CashPaymentModal } from "../CashPaymentModal";
import { calculateCartTotals } from "../hooks/cartTotals";

import { CartItemCard } from "./CartItemCard";
import { CartPaymentSection } from "./CartPaymentSection";
import { CartTotals } from "./CartTotals";
import { SwipeableCartItem } from "./SwipeableCartItem";

export function SummaryContent({
  cartItems,
  discount,
  onRemoveProduct,
  onUpdateQuantity,
  startRemoval,
  cancelRemoval,
  onPay,
  isPaying,
  paymentError,
  onClearPaymentError,
  btcPayment,
  cashPayment,
  cardPayment,
}) {
  const cartTranslations = useTranslations("cart");
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const isTouchDevice = useSyncExternalStore(() => () => {}, () => navigator.maxTouchPoints > 0, () => false);
  const removalToastKeys = useRef({});
  const visibleItems = cartItems || [];

  const { subtotal, discountAmount, total } = calculateCartTotals(visibleItems, discount);

  const handleUndoRemoval = (itemId) => {
    cancelRemoval(itemId);
    const toastKey = removalToastKeys.current[itemId];
    if (toastKey) {
      closeToast(toastKey);
      delete removalToastKeys.current[itemId];
    }
  };

  const handleStartRemoval = (item) => {
    startRemoval(item.id, () => {
      onRemoveProduct(item.id);
      delete removalToastKeys.current[item.id];
    });
    removalToastKeys.current[item.id] = addToast({
      description: item.name,
      timeout: 5000,
      endContent: (
        <Button
          size="sm"
          color="primary"
          className="bg-green-800"
          onPress={() => handleUndoRemoval(item.id)}
        >
          {cartTranslations("summary.undoToast.undo")}
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
          isDisabled={!isMounted || !visibleItems.length}
          paymentError={paymentError}
          onClearPaymentError={onClearPaymentError}
          onPay={(selectedPaymentMethod) => {
            onClearPaymentError?.();
            onPay?.({ items: visibleItems, subtotal, discount, discountAmount, total, selectedPaymentMethod });
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
