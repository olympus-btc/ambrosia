"use client";
import { useEffect } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { BTC_CHECKOUT_ENDPOINT, buildBtcCheckoutPaymentStatusEndpoint } from "@/lib/btcCheckoutEndpoints";
import {
  deleteCheckout,
  getCompletedCheckouts,
  getPendingCheckouts,
  markCheckoutCompleted,
} from "@/lib/btcCheckoutStore";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function useBtcCheckoutRecovery(onResetCart) {
  const paymentTranslations = useTranslations("cart.payment");

  useEffect(() => {
    async function notifyRecoveredAndDelete(paymentHash, completedResult) {
      if (completedResult) {
        await markCheckoutCompleted(paymentHash, completedResult).catch(() => {});
      }
      addToast({ color: "success", description: paymentTranslations("success.btcRecovered") });
      await deleteCheckout(paymentHash).catch(() => {});
      onResetCart?.();
    }

    async function recoverPendingCheckout(pendingCheckout) {
      const paymentStatusResponse = await httpClient(
        buildBtcCheckoutPaymentStatusEndpoint(pendingCheckout.paymentHash),
        { skipForbiddenRedirect: true },
      );
      if (!paymentStatusResponse.ok) return;
      const paymentStatus = await parseJsonResponse(paymentStatusResponse);

      if (paymentStatus?.status === "completed") {
        await notifyRecoveredAndDelete(pendingCheckout.paymentHash, paymentStatus);
        return;
      }

      if (paymentStatus?.status === "paid") {
        const checkoutResponse = await httpClient(BTC_CHECKOUT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingCheckout.checkoutPayload),
          skipForbiddenRedirect: true,
        });
        if (!checkoutResponse.ok) return;
        const checkoutResult = await parseJsonResponse(checkoutResponse);
        await notifyRecoveredAndDelete(pendingCheckout.paymentHash, checkoutResult);
      }
    }

    async function recoverBtcCheckouts() {
      try {
        const completedCheckouts = await getCompletedCheckouts();
        for (const completedCheckout of completedCheckouts) {
          await notifyRecoveredAndDelete(completedCheckout.paymentHash);
        }

        const pendingCheckouts = await getPendingCheckouts();
        for (const pendingCheckout of pendingCheckouts) {
          try {
            await recoverPendingCheckout(pendingCheckout);
          } catch {
            continue;
          }
        }
      } catch {
        return;
      }
    }

    recoverBtcCheckouts();
  }, [paymentTranslations, onResetCart]);
}
