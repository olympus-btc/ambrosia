"use client";
import { useState } from "react";
import { useTurn } from "../../modules/cashier/useTurn";

export default function OpenTurnForm({ onOpened, submitLabel = "🔓 Abrir Turno" }) {
  const [initialAmount, setInitialAmount] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
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
      const id = await openShift();
      updateTurn(id);
      onOpened?.(id);
    } catch (err) {
      setError(err.message || "Error al abrir el turno");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-base text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-3">
          <label className="text-lg font-semibold text-center">
            Cantidad inicial en caja
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold">
              $
            </span>
            <input
              type="text"
              value={initialAmount}
              onChange={handleAmountChange}
              placeholder="0.00"
              className="text-2xl p-4 pl-12 rounded-xl w-full text-center font-bold border-2 border-gray-200 focus:border-green-500 focus:outline-none"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-green-500 text-white text-2xl py-4 rounded-xl hover:bg-green-600 transition-colors font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? "Abriendo turno..." : submitLabel}
        </button>
      </form>
    </div>
  );
}
