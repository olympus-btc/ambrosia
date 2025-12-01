"use client";
import { useRouter } from "next/navigation";
import OpenTurnForm from "../../components/cashier/OpenTurnForm";
export default function OpenTurn() {
  const router = useRouter();

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
