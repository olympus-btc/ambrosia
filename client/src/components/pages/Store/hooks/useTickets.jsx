"use client";
import { useState, useEffect, useCallback } from "react";

import { apiClient } from "@/services/apiClient";

export function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient("/tickets");
      if (Array.isArray(res)) {
        setTickets(res);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTicket = useCallback(
    async (ticketBody) => {
      try {
        const created = await apiClient("/tickets", {
          method: "POST",
          body: ticketBody,
        });
        if (created?.id) {
          setTickets((prev) => (Array.isArray(prev) ? [...prev, created] : [created]),
          );
        }
        return created;
      } catch (err) {
        console.error("Error creating ticket:", err);
        setError(err);
        throw err;
      }
    },
    [],
  );

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return {
    tickets,
    loading,
    error,
    refetch: fetchTickets,
    createTicket,
  };
}
