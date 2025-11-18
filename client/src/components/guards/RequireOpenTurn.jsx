"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingCard from "../LoadingCard";
import { useTurn } from "../../modules/cashier/useTurn";

export default function RequireOpenTurn({ children, autoRedirect = true }) {
  const router = useRouter();
  const { openTurn, loading } = useTurn();

  useEffect(() => {
    if (!loading && !openTurn && autoRedirect) {
      router.replace("/open-turn");
    }
  }, [loading, openTurn, autoRedirect, router]);

  if (loading) {
    return <LoadingCard message="Verificando turno..." />;
  }

  if (!openTurn) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="bg-amber-100 rounded-xl p-8 max-w-xl text-center shadow">
          <h2 className="text-2xl font-bold mb-2">Se requiere un turno abierto</h2>
          <p className="text-gray-700 mb-6">
            Para realizar operaciones de venta necesitas abrir un turno.
          </p>
          <button
            onClick={() => router.push("/open-turn")}
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
          >
            Abrir turno
          </button>
        </div>
      </div>
    );
  }

  return children;
}
