"use client";
import { useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { httpClient, parseJsonResponse } from "@/lib/http";

export function useProductVariants() {
  const t = useTranslations("products");

  const notifyError = useCallback(
    (status) => {
      if (status === 409) {
        addToast({
          title: t("toasts.duplicateVariantSkuTitle"),
          description: t("toasts.duplicateVariantSkuDescription"),
          color: "danger",
        });
        return;
      }
      addToast({
        title: t("toasts.genericErrorTitle"),
        description: t("toasts.genericErrorDescription"),
        color: "danger",
      });
    },
    [t],
  );

  const fetchProductDetail = useCallback(async (productId) => {
    const response = await httpClient(`/products/${productId}`);
    const data = await parseJsonResponse(response, null);
    return data;
  }, []);

  const addVariant = useCallback(
    async (productId, variantData) => {
      const response = await httpClient(`/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variantData),
        notShowError: false,
      });
      const payload = await parseJsonResponse(response, null);
      if (!response.ok) {
        notifyError(response.status);
        return null;
      }
      return payload?.id ?? null;
    },
    [notifyError],
  );

  const updateVariant = useCallback(
    async (productId, variantId, variantData) => {
      const response = await httpClient(`/products/${productId}/variants/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variantData),
        notShowError: false,
      });
      if (!response.ok) {
        notifyError(response.status);
        return false;
      }
      return true;
    },
    [notifyError],
  );

  const deleteVariant = useCallback(async (productId, variantId) => {
    await httpClient(`/products/${productId}/variants/${variantId}`, {
      method: "DELETE",
    });
  }, []);

  const addOptionType = useCallback(
    async (productId, optionData) => {
      const response = await httpClient(`/products/${productId}/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optionData),
        notShowError: false,
      });
      const payload = await parseJsonResponse(response, null);
      if (!response.ok) {
        notifyError(response.status);
        return null;
      }
      return payload?.id ?? null;
    },
    [notifyError],
  );

  const updateOptionType = useCallback(
    async (productId, optionTypeId, optionData) => {
      const response = await httpClient(`/products/${productId}/options/${optionTypeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optionData),
        notShowError: false,
      });
      if (!response.ok) {
        notifyError(response.status);
        return false;
      }
      return true;
    },
    [notifyError],
  );

  const deleteOptionType = useCallback(async (productId, optionTypeId) => {
    await httpClient(`/products/${productId}/options/${optionTypeId}`, {
      method: "DELETE",
    });
  }, []);

  return {
    fetchProductDetail,
    addVariant,
    updateVariant,
    deleteVariant,
    addOptionType,
    updateOptionType,
    deleteOptionType,
  };
}
