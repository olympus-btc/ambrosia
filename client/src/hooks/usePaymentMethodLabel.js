import { useCallback } from "react";

import { useTranslations } from "next-intl";

import { getPaymentMethodTranslationKey } from "@/components/pages/Store/Cart/utils/paymentMethods";

export function usePaymentMethodLabel() {
  const paymentMethodTranslations = useTranslations("paymentMethods");

  const getPaymentMethodLabel = useCallback((methodName) => {
    if (!methodName) return methodName;
    const translationKey = getPaymentMethodTranslationKey(methodName);
    return translationKey ? paymentMethodTranslations(translationKey) : methodName;
  }, [paymentMethodTranslations]);

  return { getPaymentMethodLabel };
}
