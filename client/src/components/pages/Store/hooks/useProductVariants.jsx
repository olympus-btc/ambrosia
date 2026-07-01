"use client";
import { useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { httpClient, parseJsonResponse } from "@/lib/http";

export function useProductVariants() {
  const productsTranslations = useTranslations("products");

  const notifyError = useCallback(
    (status) => {
      if (status === 409) {
        addToast({
          title: productsTranslations("toasts.duplicateVariantSkuTitle"),
          description: productsTranslations("toasts.duplicateVariantSkuDescription"),
          color: "danger",
        });
        return;
      }
      addToast({
        title: productsTranslations("toasts.genericErrorTitle"),
        description: productsTranslations("toasts.genericErrorDescription"),
        color: "danger",
      });
    },
    [productsTranslations],
  );

  const postAndReturnCreatedId = useCallback(async (endpoint, requestPayload) => {
    const postResponse = await httpClient(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
      notShowError: false,
    });
    const createdResource = await parseJsonResponse(postResponse, null);
    if (!postResponse.ok) {
      notifyError(postResponse.status);
      return null;
    }
    return createdResource?.id ?? null;
  }, [notifyError]);

  const sendMutationRequest = useCallback(async (endpoint, method, requestPayload = null) => {
    const mutationResponse = await httpClient(endpoint, {
      method,
      ...(requestPayload !== null ? {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      } : {}),
      notShowError: false,
    });
    if (!mutationResponse.ok) {
      notifyError(mutationResponse.status);
      return false;
    }
    return true;
  }, [notifyError]);

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
    async (productId, variantRequest) => postAndReturnCreatedId(`/products/${productId}/variants`, variantRequest),
    [postAndReturnCreatedId],
  );

  const updateVariant = useCallback(
    async (productId, variantId, variantRequest) => sendMutationRequest(
      `/products/${productId}/variants/${variantId}`,
      "PUT",
      variantRequest,
    ),
    [sendMutationRequest],
  );

  const deleteVariant = useCallback(
    async (productId, variantId) => sendMutationRequest(`/products/${productId}/variants/${variantId}`, "DELETE"),
    [sendMutationRequest],
  );

  const addOptionType = useCallback(
    async (productId, optionTypeRequest) => postAndReturnCreatedId(`/products/${productId}/options`, optionTypeRequest),
    [postAndReturnCreatedId],
  );

  const updateOptionType = useCallback(
    async (productId, optionTypeId, optionTypeRequest) => sendMutationRequest(
      `/products/${productId}/options/${optionTypeId}`,
      "PUT",
      optionTypeRequest,
    ),
    [sendMutationRequest],
  );

  const deleteOptionType = useCallback(
    async (productId, optionTypeId) => sendMutationRequest(`/products/${productId}/options/${optionTypeId}`, "DELETE"),
    [sendMutationRequest],
  );

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
