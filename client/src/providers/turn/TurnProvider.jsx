"use client";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/auth/useAuth";
import { getTurnOpen, openTurn, closeTurn } from "@/services/shiftsService";

export const TurnContext = createContext();

export function TurnProvider({ children }) {
  const [openTurnId, setOpenTurnId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const loadOpenTurn = useCallback(async () => {
    try {
      setError(null);
      const id = await getTurnOpen();
      setOpenTurnId(id);
      return id;
    } catch (err) {
      setError(err?.message || "Error al obtener turno");
      setOpenTurnId(null);
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

  const openShift = useCallback(async () => {
    const result = await openTurn(user?.id || user?.user_id);
    const id = result?.id ?? null;
    setOpenTurnId(id);
    return id;
  }, [user]);

  const closeShift = useCallback(async () => {
    if (!openTurnId) return false;
    await closeTurn(openTurnId);
    setOpenTurnId(null);
    return true;
  }, [openTurnId]);

  const value = useMemo(
    () => ({
      openTurn: openTurnId,
      loading,
      error,
      setOpenTurn: setOpenTurnId,
      updateTurn,
      refreshTurn,
      openShift,
      closeShift,
    }),
    [openTurnId, loading, error, updateTurn, refreshTurn, openShift, closeShift],
  );

  return (
    <TurnContext.Provider value={value}>
      {children}
    </TurnContext.Provider>
  );
}
