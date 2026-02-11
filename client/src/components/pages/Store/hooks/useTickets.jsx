"use client";
import { useState, useEffect, useCallback } from "react";

import { httpClient } from "@/lib/http/httpClient";

export function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tickets = await httpClient("/tickets");

      const ticketsData = await tickets.json();

      if (Array.isArray(ticketsData)) {
        setTickets(ticketsData);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTicket = useCallback(
    async (ticketBody) => {
      try {
        const createTicket = await httpClient("/tickets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ticketBody),
        });

        const createdDataTicket = createTicket.json();

        if (createdDataTicket?.id) {
          setTickets((prev) => (Array.isArray(prev) ? [...prev, createdDataTicket] : [createdDataTicket]),
          );
        }
        return createdDataTicket;
      } catch (error) {
        console.error("Error creating ticket:", error);
        setError(error);
        throw error;
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
