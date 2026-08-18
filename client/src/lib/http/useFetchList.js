"use client";
import { useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { httpClient, parseJsonResponse } from "./index";

export function useFetchList() {
  const errorsTranslations = useTranslations("errors");

  const fetchList = useCallback(async (url, fallback = [], options = {}) => {
    const listResponse = await httpClient(url, options);
    if (!listResponse.ok) {
      addToast({
        title: errorsTranslations("connectionErrorTitle"),
        description: errorsTranslations("connectionErrorDescription"),
        color: "danger",
      });
      return null;
    }
    return parseJsonResponse(listResponse, fallback);
  }, [errorsTranslations]);

  return { fetchList };
}
