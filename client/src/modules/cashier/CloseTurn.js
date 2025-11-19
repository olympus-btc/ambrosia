"use client";
import { useState } from "react";
import { closeTurn } from "./cashierService";
import { useTurn } from "./useTurn";
import { useRouter } from "next/navigation";

export default function CloseTurn() {
  const [finalAmount, setFinalAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const { openTurn, updateTurn } = useTurn();

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setFinalAmount(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!finalAmount) {
      setError("Debes ingresar la cantidad final de dinero en caja");
      return;
    }

    const amount = parseFloat(finalAmount);
    if (isNaN(amount) || amount < 0) {
      setError("Ingresa una cantidad válida");
      return;
    }

    setIsLoading(true);
    try {
      await closeTurn(openTurn);
      updateTurn(null);
      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      router.push("/");
    } catch (err) {
      setError(err.message || "Error al cerrar el turno");
    } finally {
      setIsLoading(false);
    }
  };

  // const addQuickAmount = (amount) => {
  //   setFinalAmount(amount.toString());
  // };

  return (
    <main className="h-[90%] w-full flex items-center justify-center">
      <div className="h-[90%] w-[90%] bg-amber-100 rounded-xl p-6 flex flex-col items-center justify-center gap-8">
        <h2 className="text-4xl font-bold text-center">Cerrar Turno</h2>

        <div className="text-center text-xl text-gray-700 max-w-2xl">
          <p>
            Cuenta el dinero en caja e ingresa la cantidad total para cerrar el
            turno
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-xl text-xl max-w-2xl w-full text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-xl text-xl max-w-2xl w-full text-center">
            Turno cerrado exitosamente
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 w-full max-w-2xl"
        >
          <div className="flex flex-col gap-4">
            <label className="text-2xl font-semibold text-center">
              Cantidad final en caja
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-3xl font-bold">
                $
              </span>
              <input
                type="text"
                value={finalAmount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="text-3xl p-4 pl-12 rounded-xl w-full text-center font-bold border-2 border-gray-300 focus:border-red-500 focus:outline-none"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-red-500 text-white text-3xl py-6 rounded-xl hover:bg-red-600 transition-colors font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Cerrando turno..." : "🔒 Cerrar Turno"}
          </button>
        </form>
      </div>
    </main>
  );
}
