"use client";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useShiftTicketMetrics } from "@/hooks/turn/useShiftTicketMetrics";
import { getTurnOpen, openTurn, closeTurn } from "@/services/shiftsService";

export const TurnContext = createContext();

export function TurnProvider({ children }) {
  const { user } = useAuth();

  const [openTurnId, setOpenTurnId] = useState(null);
  const [openShiftData, setOpenShiftData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    totalBalance,
    totalTickets,
    byPaymentMethod,
    ticketsLoading,
    breakdownLoading,
    refresh: refreshShiftTickets,
    reset: resetTicketMetrics,
  } = useShiftTicketMetrics(openShiftData);

  const loadOpenTurn = useCallback(async () => {
    try {
      setError(null);
      const shift = await getTurnOpen();
      setOpenTurnId(shift?.id ?? null);
      setOpenShiftData(shift);
      return shift?.id ?? null;
    } catch (caughtError) {
      setError(caughtError?.message || "Error al obtener turno");
      setOpenTurnId(null);
      setOpenShiftData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOpenTurn();
  }, [loadOpenTurn, user?.id]);

  const updateTurn = useCallback((newTurnId) => {
    setOpenTurnId(newTurnId);
  }, []);

  const refreshTurn = useCallback(async () => {
    setLoading(true);
    return await loadOpenTurn();
  }, [loadOpenTurn]);

  const openShift = useCallback(async (initialAmount = 0) => {
    const result = await openTurn(user?.id || user?.userId, initialAmount);
    const id = result?.id ?? null;
    setOpenTurnId(id);
    if (id) {
      const shift = await getTurnOpen();
      setOpenShiftData(shift);
    }
    return id;
  }, [user]);

  const closeShift = useCallback(async (finalAmount = null, difference = null) => {
    if (!openTurnId) return false;
    await closeTurn(openTurnId, finalAmount, difference);
    setOpenTurnId(null);
    setOpenShiftData(null);
    resetTicketMetrics();
    return true;
  }, [openTurnId, resetTicketMetrics]);

  const value = useMemo(
    () => ({
      openTurn: openTurnId,
      openShiftData,
      loading,
      error,
      setOpenTurn: setOpenTurnId,
      updateTurn,
      refreshTurn,
      checkOpenShift: loadOpenTurn,
      openShift,
      closeShift,
      totalBalance,
      totalTickets,
      byPaymentMethod,
      ticketsLoading,
      breakdownLoading,
      refreshShiftTickets,
    }),
    [
      openTurnId, openShiftData, loading, error,
      updateTurn, refreshTurn, loadOpenTurn, openShift, closeShift,
      totalBalance, totalTickets, byPaymentMethod, ticketsLoading, breakdownLoading,
      refreshShiftTickets,
    ],
  );

  return (
    <TurnContext.Provider value={value}>
      {children}
    </TurnContext.Provider>
  );
}
