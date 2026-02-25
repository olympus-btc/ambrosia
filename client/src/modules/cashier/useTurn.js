"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { getTurnOpen } from "./cashierService";
import { useAuth } from "../auth/useAuth";

const TurnContext = createContext();

export function TurnProvider({ children }) {
  const [openTurn, setOpenTurn] = useState(null);
  const { isAuth } = useAuth();

  useEffect(() => {
    if (!isAuth) return;
    const handleOpenTurn = async () => {
      const data = await getTurnOpen();
      setOpenTurn(data);
    };
    handleOpenTurn();
  }, [isAuth]);

  const updateTurn = (newTurnData) => {
    setOpenTurn(newTurnData);
  };

  const refreshTurn = async () => {
    try {
      const { data } = await getTurnOpen();
      setOpenTurn(data);
      return data;
    } catch (error) {
      console.error("Error al refrescar el turno:", error);
      return null;
    }
  };

  return (
    <TurnContext.Provider
      value={{
        openTurn,
        setOpenTurn,
        updateTurn,
        refreshTurn,
      }}
    >
      {children}
    </TurnContext.Provider>
  );
}

export const useTurn = () => useContext(TurnContext);
