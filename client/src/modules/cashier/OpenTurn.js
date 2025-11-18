"use client";
import { useState } from "react";
import { openTurn as openTurnService } from "./cashierService";
import { useRouter } from "next/navigation";
import { useTurn } from "./useTurn";
import { useAuth } from "./../auth/useAuth";

export default function OpenTurn() {
  const [initialAmount, setInitialAmount] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  const router = useRouter();
  const { updateTurn, openShift } = useTurn();

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setInitialAmount(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!initialAmount || initialAmount === "0" || initialAmount === "0.00") {
      setError("Debes ingresar una cantidad válida para abrir el turno");
      return;
    }

    const amount = parseFloat(initialAmount);
    if (isNaN(amount) || amount < 0) {
      setError("Ingresa una cantidad válida");
      return;
    }

    setIsLoading(true);
    try {
      const id = await openShift().catch(
        async () => await openTurnService(user?.user_id),
      );
      updateTurn(id);
      router.push("/");
    } catch (err) {
      setError(err.message || "Error al abrir el turno");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="h-[90%] w-full flex items-center justify-center">
      <div className="h-[90%] w-[90%] bg-amber-100 rounded-xl p-6 flex flex-col items-center justify-center gap-8">
        <h2 className="text-4xl font-bold text-center">Abrir Turno</h2>

        <div className="text-center text-xl text-gray-700 max-w-2xl">
          <p>
            Ingresa la cantidad de dinero que hay actualmente en caja para
            iniciar el turno
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-xl text-xl max-w-2xl w-full text-center">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 w-full max-w-2xl"
        >
          <div className="flex flex-col gap-4">
            <label className="text-2xl font-semibold text-center">
              Cantidad inicial en caja
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-3xl font-bold">
                $
              </span>
              <input
                type="text"
                value={initialAmount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="text-3xl p-4 pl-12 rounded-xl w-full text-center font-bold border-2 border-gray-300 focus:border-green-500 focus:outline-none"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-green-500 text-white text-3xl py-6 rounded-xl hover:bg-green-600 transition-colors font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Abriendo turno..." : "🔓 Abrir Turno"}
          </button>
        </form>
      </div>
    </main>
  );
}
