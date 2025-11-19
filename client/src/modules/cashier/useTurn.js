"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getTurnOpen as fetchOpenTurn,
  openTurn as createTurn,
  closeTurn as closeTurnApi,
} from "./cashierService";
import { useAuth } from "./../auth/useAuth";

const TurnContext = createContext();

export function TurnProvider({ children }) {
  const [openTurn, setOpenTurn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const loadOpenTurn = async () => {
    try {
      setError(null);
      const userId =
        user?.user_id ||
        (typeof window !== "undefined" ? localStorage.getItem("userId") : null);
      const id = await fetchOpenTurn(userId || undefined);
      setOpenTurn(id);
      return id;
    } catch (err) {
      console.error("Error al obtener turno abierto:", err);
      setError(err?.message || "Error al obtener turno");
      setOpenTurn(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpenTurn();
  }, [user?.id]);

  const updateTurn = (newTurnId) => setOpenTurn(newTurnId);

  const refreshTurn = async () => {
    setLoading(true);
    return await loadOpenTurn();
  };

  const openShift = async () => {
    const id = await createTurn(user?.user_id);
    setOpenTurn(id);
    return id;
  };

  const closeShift = async () => {
    if (!openTurn) return false;
    await closeTurnApi(openTurn);
    setOpenTurn(null);
    return true;
  };

  const value = useMemo(
    () => ({
      openTurn,
      loading,
      error,
      setOpenTurn,
      updateTurn,
      refreshTurn,
      openShift,
      closeShift,
    }),
    [openTurn, loading, error],
  );

  return <TurnContext.Provider value={value}>{children}</TurnContext.Provider>;
}

export const useTurn = () => useContext(TurnContext);
