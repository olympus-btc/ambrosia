"use client";

import { useCallback, useEffect, useState } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function usePayoutAccounts({ skipForbiddenRedirect = false } = {}) {
  const [payoutAccounts, setPayoutAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const fetchPayoutAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const payoutAccountsResponse = await httpClient("/freelance/payout-accounts", { skipForbiddenRedirect });
      setForbidden(payoutAccountsResponse.status === 403);
      if (!payoutAccountsResponse.ok) return;

      const payoutAccountsData = await parseJsonResponse(payoutAccountsResponse, []);
      setPayoutAccounts(toArray(payoutAccountsData));
    } catch (loadPayoutAccountsError) {
      setLoadError(loadPayoutAccountsError);
    } finally {
      setLoading(false);
    }
  }, [skipForbiddenRedirect]);

  useEffect(() => {
    fetchPayoutAccounts();
  }, [fetchPayoutAccounts]);

  return {
    payoutAccounts,
    loading,
    error: loadError,
    forbidden,
    refetch: fetchPayoutAccounts,
  };
}
