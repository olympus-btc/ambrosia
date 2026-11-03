"use client";
import { useState, useEffect, useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { buildParsedHttpError } from "@/components/pages/Store/utils/buildHttpError";
import { isConflict, resolveMutationErrorToast, translateToast } from "@/components/pages/Store/utils/mutationErrorToast";
import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

import { buildTimeEntryPayload } from "../Timesheet/utils/buildTimeEntryPayload";

function buildTimeEntriesQuery({ fromDate, toDate, clientId, projectId }) {
  const timeEntriesQueryParams = new URLSearchParams({ from: fromDate, to: toDate });
  if (clientId) timeEntriesQueryParams.set("client_id", clientId);
  if (projectId) timeEntriesQueryParams.set("project_id", projectId);
  return timeEntriesQueryParams.toString();
}

export function useTimeEntries({ fromDate, toDate, clientId = "", projectId = "" }) {
  const timesheetTranslations = useTranslations("timesheet");
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const genericMutationErrorToast = translateToast(timesheetTranslations, "toasts.genericErrorTitle", "toasts.genericErrorDescription", "danger");

  const timeEntryMutationErrorRules = [
    {
      when: isConflict,
      toast: translateToast(timesheetTranslations, "toasts.lockedTitle", "toasts.lockedDescription", "danger"),
    },
  ];

  const notifyMutationError = (requestError) => {
    addToast(resolveMutationErrorToast(requestError, timeEntryMutationErrorRules, genericMutationErrorToast));
  };

  const fetchTimeEntries = useCallback(async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    setError(null);
    try {
      const timeEntriesResponse = await httpClient(
        `/freelance/time-entries?${buildTimeEntriesQuery({ fromDate, toDate, clientId, projectId })}`,
        { skipForbiddenRedirect: true },
      );
      setForbidden(timeEntriesResponse.status === 403);
      if (!timeEntriesResponse.ok) return;
      const fetchedTimeEntries = await parseJsonResponse(timeEntriesResponse, []);
      setTimeEntries(toArray(fetchedTimeEntries));
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, clientId, projectId]);

  const createTimeEntry = async (timeEntryForm) => {
    try {
      const createTimeEntryResponse = await httpClient("/freelance/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildTimeEntryPayload(timeEntryForm)),
        skipForbiddenRedirect: true,
      });

      if (createTimeEntryResponse.ok === false) {
        throw await buildParsedHttpError(createTimeEntryResponse, "Error creating time entry");
      }

      await fetchTimeEntries();
      return await parseJsonResponse(createTimeEntryResponse, null);
    } catch (requestError) {
      notifyMutationError(requestError);
      throw requestError;
    }
  };

  const updateTimeEntry = async (timeEntryId, timeEntryForm) => {
    try {
      const updateTimeEntryResponse = await httpClient(`/freelance/time-entries/${timeEntryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildTimeEntryPayload(timeEntryForm)),
        skipForbiddenRedirect: true,
      });

      if (updateTimeEntryResponse.ok === false) {
        throw await buildParsedHttpError(updateTimeEntryResponse, "Error updating time entry");
      }

      await fetchTimeEntries();
      return await parseJsonResponse(updateTimeEntryResponse, null);
    } catch (requestError) {
      notifyMutationError(requestError);
      throw requestError;
    }
  };

  const deleteTimeEntry = async (timeEntryId) => {
    try {
      const deleteTimeEntryResponse = await httpClient(`/freelance/time-entries/${timeEntryId}`, {
        method: "DELETE",
        skipForbiddenRedirect: true,
      });

      if (deleteTimeEntryResponse.ok === false) {
        throw await buildParsedHttpError(deleteTimeEntryResponse, "Error deleting time entry");
      }

      await fetchTimeEntries();
    } catch (requestError) {
      notifyMutationError(requestError);
      throw requestError;
    }
  };

  useEffect(() => {
    fetchTimeEntries();
  }, [fetchTimeEntries]);

  return {
    timeEntries,
    loading,
    error,
    forbidden,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    refetch: fetchTimeEntries,
  };
}
