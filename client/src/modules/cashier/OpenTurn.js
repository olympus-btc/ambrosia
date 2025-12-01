"use client";
import { useState } from "react";
import { useTurn } from "./useTurn";
import { useRouter } from "next/navigation";

export default function OpenTurn() {
  const [initialAmount, setInitialAmount] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
      const id = await openShift();
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

        <div className="w-full max-w-2xl">
          <OpenTurnForm onOpened={() => router.push("/")} />
        </div>
      </div>
    </main>
  );
}
