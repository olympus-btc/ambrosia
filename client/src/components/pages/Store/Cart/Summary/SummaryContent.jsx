import { useMemo, useState } from "react";

import { Button, Card, CardBody, CardHeader, Divider, NumberInput, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { DeleteButton } from "@/components/shared/DeleteButton";

import { BitcoinPaymentModal } from "../BitcoinPaymentModal";
import { CardPaymentModal } from "../CardPaymentModal";
import { CashPaymentModal } from "../CashPaymentModal";
import { usePaymentMethods } from "../hooks/usePaymentMethod";

export function SummaryContent({
  cartItems,
  discount,
  onRemoveProduct,
  onUpdateQuantity,
  onPay,
  isPaying,
  paymentError,
  btcPaymentConfig,
  onInvoiceReady,
  onBtcComplete,
  onCloseBtcPayment,
  cashPaymentConfig,
  onCashComplete,
  onCloseCashPayment,
  cardPaymentConfig,
  onCardComplete,
  onCloseCardPayment,
  onClearPaymentError,
}) {
  const t = useTranslations("cart");
  const { formatAmount } = useCurrency();
  const { paymentMethods } = usePaymentMethods();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const items = cartItems || [];

  const effectivePaymentMethod = useMemo(() => {
    if (selectedPaymentMethod) return selectedPaymentMethod;
    const bitcoinLightningMethod = paymentMethods.find((method) => method.name === "BTC");
    return bitcoinLightningMethod ? String(bitcoinLightningMethod.id) : "";
  }, [selectedPaymentMethod, paymentMethods]);

  const { subtotal, discountAmount, total } = useMemo(() => {
    const itemsToProcess = cartItems || [];
    const subtotalValue = itemsToProcess.reduce((sum, item) => sum + item.subtotal, 0);
    const discountValue = Number(discount) || 0;
    const discountTotal = (subtotalValue * discountValue) / 100;
    const totalValue = subtotalValue - discountTotal;

    return {
      subtotal: subtotalValue,
      discountAmount: discountTotal,
      total: totalValue,
    };
  }, [cartItems, discount]);

  const handlePay = () => {
    onClearPaymentError?.();
    onPay?.({
      items,
      subtotal,
      discount,
      discountAmount,
      total,
      selectedPaymentMethod: effectivePaymentMethod,
    });
  };

  return (
    <>
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="shadow-none border-1 border-green-600">
            <CardHeader>
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-green-900">
                  {item.name}
                </h3>
                <div className="text-xs text-gray-700">
                  {formatAmount(item.price)} {t("summary.each")}
                </div>
              </div>
              <div className="absolute right-5">
                <DeleteButton onPress={() => onRemoveProduct(item.id)} />
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-between">
                <NumberInput
                  className="w-1/2"
                  label={t("summary.quantity")}
                  minValue={1}
                  size="sm"
                  placeholder="Enter the amount"
                  value={item.quantity}
                  onChange={(value) => onUpdateQuantity(item.id, Number(value))}
                />
                <div className="text-sm font-semibold text-green-900">
                  {formatAmount(item.subtotal)}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}

        <div className="space-y-2 text-sm text-gray-800">
          <div className="flex justify-between">
            <span>{t("summary.subtotal")}</span>
            <span>{formatAmount(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("summary.discount")}</span>
            <span>{formatAmount(discountAmount)}</span>
          </div>
          <Divider className="bg-green-600" />
          <div className="flex justify-between items-center font-semibold text-green-900">
            <span>{t("summary.total")}:</span>
            <span className="text-lg">{formatAmount(total)}</span>
          </div>
        </div>

        {paymentError && (
          <p className="text-sm text-red-600">{paymentError}</p>
        )}

        <div className="space-y-2">
          <Select
            label={t("summary.paymentMethodLabel")}
            placeholder={t("summary.paymentMethodSelectPlaceholder")}
            isRequired
            errorMessage={t("summary.errorMsgSelectEmpty")}
            selectedKeys={effectivePaymentMethod ? [effectivePaymentMethod] : []}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0];
              if (!value) return;
              setSelectedPaymentMethod(value);
              onClearPaymentError?.();
            }}
            isDisabled={isPaying}
          >
            {paymentMethods.map((method) => (
              <SelectItem key={method.id} value={method.id}>
                {method.name === "BTC" ? `${method.name} (Lightning)` : method.name}
              </SelectItem>
            ))}
          </Select>

          <Button
            color="primary"
            className="w-full"
            size="lg"
            isLoading={isPaying}
            isDisabled={!items.length}
            onPress={handlePay}
          >
            {t("summary.pay")}
          </Button>
        </div>
      </div>

      <BitcoinPaymentModal
        isOpen={!!btcPaymentConfig}
        amountFiat={btcPaymentConfig?.amountFiat}
        currencyAcronym={btcPaymentConfig?.currencyAcronym}
        paymentId={btcPaymentConfig?.paymentId}
        invoiceDescription={btcPaymentConfig?.invoiceDescription}
        displayTotal={btcPaymentConfig?.displayTotal}
        onClose={onCloseBtcPayment}
        onInvoiceReady={onInvoiceReady}
        onComplete={onBtcComplete}
      />

      <CashPaymentModal
        isOpen={!!cashPaymentConfig}
        amountDue={cashPaymentConfig?.amountDue}
        displayTotal={cashPaymentConfig?.displayTotal}
        onClose={onCloseCashPayment}
        onComplete={onCashComplete}
      />

      <CardPaymentModal
        isOpen={!!cardPaymentConfig}
        amountDue={cardPaymentConfig?.amountDue}
        displayTotal={cardPaymentConfig?.displayTotal}
        methodLabel={cardPaymentConfig?.methodLabel}
        onClose={onCloseCardPayment}
        onComplete={onCardComplete}
      />
    </>
  );
}
