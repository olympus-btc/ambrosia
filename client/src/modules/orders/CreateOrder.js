"use client";
import { useState } from "react";

import { useRouter } from "next/navigation";

import { createOrder } from "./ordersService";

export default function CreateOrder() {
  //deprecated unused
  const { tableId } = useParams();
  const navigate = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleButtonClick = (num) => {
    if (pin.length < 4) {
      setPin((prevPin) => prevPin + num);
    }
  };

  const handleClear = () => {
    setPin(pin.slice(0, -1));
  };

  const handleCreateOrder = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await createOrder(pin, tableId);
      navigate(`/modify-order/${response.data.id}?isNew=true`);
    } catch (error) {
      setError(error.message || "Error al crear el pedido");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="h-[90%] w-full flex items-center justify-center">
        <div className="h-[80%] w-[80%] bg-amber-200 flex flex-col items-center justify-center p-6">
          <p className="text-3xl font-bold">Creando pedido...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[90%] w-full flex items-center justify-center">
      <div className="h-[80%] w-[80%] bg-amber-200 rounded-xl p-6 flex flex-col items-center justify-center gap-6">
        <h2 className="text-3xl font-bold">Nuevo Pedido</h2>

        {tableId && (
          <p className="text-2xl">
            Mesa asignada: <strong>{tableId}</strong>
          </p>
        )}

        <div className="text-3xl font-bold mb-4">
          <p>PIN Ingresado:</p>
          <div>
            <span>{"*".repeat(pin.length)}</span>
          </div>
        </div>

        {error && <p className="text-red-600 text-xl">{error}</p>}

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="bg-gray-800 text-white py-6 px-8 text-3xl rounded-lg hover:bg-gray-700"
              onClick={() => handleButtonClick(num)}
              disabled={isLoading}
            >
              {num}
            </button>
          ))}
          <div className="col-span-3 flex justify-center">
            <button
              className="bg-gray-800 text-white py-6 px-8 text-3xl rounded-lg hover:bg-gray-700"
              onClick={() => handleButtonClick(0)}
              disabled={isLoading}
            >
              0
            </button>
          </div>
        </div>

        <div className="flex gap-6 mt-6">
          <button
            className="bg-red-500 text-white py-4 px-8 text-2xl rounded-lg hover:bg-red-600"
            onClick={handleClear}
            disabled={isLoading}
          >
            Borrar
          </button>
          <button
            onClick={handleCreateOrder}
            className="bg-green-500 text-white py-4 px-8 text-2xl rounded-lg hover:bg-green-600"
            disabled={isLoading || pin.length < 4}
          >
            Crear Pedido
          </button>
        </div>
      </div>
    </main>
  );
}
