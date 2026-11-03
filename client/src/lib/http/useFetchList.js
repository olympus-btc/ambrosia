"use client";
import { useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { buildParsedHttpError } from "@/components/pages/Store/utils/buildHttpError";

import { httpClient, parseJsonResponse } from "./index";

export function useFetchList() {
  const errorsTranslations = useTranslations("errors");

  const fetchList = useCallback(async (url, fallback = [], options = {}) => {
    const listResponse = await httpClient(url, options);
    if (!listResponse.ok) {
      const fetchListError = await buildParsedHttpError(listResponse, "Failed to fetch list");
      if (fetchListError.status !== 403) {
        addToast({
          title: errorsTranslations("requestErrorTitle"),
          description: fetchListError.responseMessage || errorsTranslations("requestErrorDescription"),
          color: "danger",
        });
      }
      throw fetchListError;
    }
    return parseJsonResponse(listResponse, fallback);
  }, [errorsTranslations]);

  return { fetchList };
}
