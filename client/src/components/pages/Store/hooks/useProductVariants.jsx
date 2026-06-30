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
    const productDetailResponse = await httpClient(`/products/${productId}`);
    const productDetailData = await parseJsonResponse(productDetailResponse, null);
    if (!productDetailResponse.ok) {
      notifyError(productDetailResponse.status);
      return null;
    }
    return productDetailData;
  }, [notifyError]);

  const addVariant = useCallback(
    async (productId, variantData) => {
      const addVariantResponse = await httpClient(`/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variantData),
        notShowError: false,
      });
      const createdVariant = await parseJsonResponse(addVariantResponse, null);
      if (!addVariantResponse.ok) {
        notifyError(addVariantResponse.status);
        return null;
      }
      return createdVariant?.id ?? null;
    },
    [notifyError],
  );

  const updateVariant = useCallback(
    async (productId, variantId, variantData) => {
      const updateVariantResponse = await httpClient(`/products/${productId}/variants/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variantData),
        notShowError: false,
      });
      if (!updateVariantResponse.ok) {
        notifyError(updateVariantResponse.status);
        return false;
      }
      return true;
    },
    [notifyError],
  );

  const deleteVariant = useCallback(async (productId, variantId) => {
    const deleteVariantResponse = await httpClient(`/products/${productId}/variants/${variantId}`, {
      method: "DELETE",
      notShowError: false,
    });
    if (!deleteVariantResponse.ok) {
      notifyError(deleteVariantResponse.status);
      return false;
    }
    return true;
  }, [notifyError]);

  const addOptionType = useCallback(
    async (productId, optionData) => {
      const addOptionTypeResponse = await httpClient(`/products/${productId}/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optionData),
        notShowError: false,
      });
      const createdOptionType = await parseJsonResponse(addOptionTypeResponse, null);
      if (!addOptionTypeResponse.ok) {
        notifyError(addOptionTypeResponse.status);
        return null;
      }
      return createdOptionType?.id ?? null;
    },
    [notifyError],
  );

  const updateOptionType = useCallback(
    async (productId, optionTypeId, optionData) => {
      const updateOptionTypeResponse = await httpClient(`/products/${productId}/options/${optionTypeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optionData),
        notShowError: false,
      });
      if (!updateOptionTypeResponse.ok) {
        notifyError(updateOptionTypeResponse.status);
        return false;
      }
      return true;
    },
    [notifyError],
  );

  const deleteOptionType = useCallback(async (productId, optionTypeId) => {
    const deleteOptionTypeResponse = await httpClient(`/products/${productId}/options/${optionTypeId}`, {
      method: "DELETE",
      notShowError: false,
    });
    if (!deleteOptionTypeResponse.ok) {
      notifyError(deleteOptionTypeResponse.status);
      return false;
    }
    return true;
  }, [notifyError]);

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
