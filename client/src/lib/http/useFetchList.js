"use client";
import { useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { httpClient, parseJsonResponse } from "./index";

export function useFetchList() {
  const tErrors = useTranslations("errors");

  const fetchList = useCallback(async (url, fallback = []) => {
    const listResponse = await httpClient(url);
    if (!listResponse.ok) {
      addToast({
        title: tErrors("connectionErrorTitle"),
        description: tErrors("connectionErrorDescription"),
        color: "danger",
      });
      return null;
    }
    return parseJsonResponse(listResponse, fallback);
  }, [tErrors]);

  return { fetchList };
}
