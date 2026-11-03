"use client";

import { useCallback, useEffect, useState } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

import { buildParsedHttpError } from "../../Store/utils/buildHttpError";

export function useFreelanceClients({ skipForbiddenRedirect = false } = {}) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const clientsResponse = await httpClient("/freelance/clients", { skipForbiddenRedirect });
      setForbidden(clientsResponse.status === 403);
      if (!clientsResponse.ok) return;

      const clientsData = await parseJsonResponse(clientsResponse, []);
      setClients(toArray(clientsData));
    } catch (loadClientsError) {
      setLoadError(loadClientsError);
    } finally {
      setLoading(false);
    }
  }, [skipForbiddenRedirect]);

  const createFreelanceClient = useCallback(
    async (clientRequest) => {
      const createClientResponse = await httpClient("/freelance/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientRequest),
        skipForbiddenRedirect: true,
      });

      if (createClientResponse.ok === false) {
        throw await buildParsedHttpError(createClientResponse, "Error creating freelance client");
      }

      const createdClientData = await parseJsonResponse(createClientResponse, {});
      await fetchClients();
      return createdClientData;
    },
    [fetchClients],
  );

  const updateFreelanceClient = useCallback(
    async (clientId, clientRequest) => {
      const updateClientResponse = await httpClient(`/freelance/clients/${clientId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientRequest),
        skipForbiddenRedirect: true,
      });

      if (updateClientResponse.ok === false) {
        throw await buildParsedHttpError(updateClientResponse, "Error updating freelance client");
      }

      const updatedClientData = await parseJsonResponse(updateClientResponse, {});
      await fetchClients();
      return updatedClientData;
    },
    [fetchClients],
  );

  const deleteFreelanceClient = useCallback(
    async (clientId) => {
      const deleteClientResponse = await httpClient(`/freelance/clients/${clientId}`, {
        method: "DELETE",
        skipForbiddenRedirect: true,
      });

      if (deleteClientResponse.ok === false) {
        throw await buildParsedHttpError(deleteClientResponse, "Error deleting freelance client");
      }

      await fetchClients();
      return deleteClientResponse;
    },
    [fetchClients],
  );

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    clients,
    loading,
    error: loadError,
    forbidden,
    refetch: fetchClients,
    createFreelanceClient,
    updateFreelanceClient,
    deleteFreelanceClient,
  };
}
