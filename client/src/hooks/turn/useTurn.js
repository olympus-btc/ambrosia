import { useContext } from "react";

import { TurnContext } from "@/providers/turn/TurnProvider";

export function useTurn() {
  const context = useContext(TurnContext);
  if (!context) {
    throw new Error("useTurn must be used within a <TurnProvider>");
  }
  return context;
}
