import { useState } from "react";

export default function RoomForm({ onSubmit, initialData, onCancel }) {
  const [nombre, setNombre] = useState(initialData?.nombre || "");
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  const [error, setError] = useState("");

  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData);
    setNombre(initialData?.nombre || "");
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }
    try {
      setError("");
      await onSubmit({
        ...initialData,
        name: nombre.trim(),
        //mesasIds: initialData?.mesasIds || [],
      });
      setNombre("");
    } catch (err) {
      setError(err.message || "Error al guardar la sala");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">
        {initialData ? "Editar Sala" : "Nueva Sala"}
      </h2>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la sala"
          className="w-full px-3 py-2 border rounded"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            {initialData ? "Guardar cambios" : "Agregar sala"}
          </button>
          {initialData && (
            <button
              type="button"
              onClick={() => {
                onCancel();
                setError("");
              }}
              className="px-4 py-2 bg-gray-400 text-white rounded"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
