import { useState } from "react";

export default function TableForm({ onSubmit, onCancel, initialData, roomId }) {
  const [nombre, setNombre] = useState(initialData?.name || "");
  const [estado, setEstado] = useState(initialData?.status || "available");
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  const [error, setError] = useState("");

  if (prevInitialData !== initialData) {
    setPrevInitialData(initialData);
    setNombre(initialData?.name || "");
    setEstado(initialData?.status || "available");
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
        status: estado,
        space_id: roomId,
      });
      setNombre("");
      setEstado("available");
    } catch (err) {
      setError(err.message || "Error al guardar la mesa");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-3">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div>
        <label className="block text-sm font-medium">Nombre de la Mesa</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
      </div>
      {/*<div>
                <label className="block text-sm font-medium">Estado</label>
                <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full border p-2 rounded"
                >
                    <option value="available">Libre</option>
                    <option value="busy">Ocupada</option>
                </select>
            </div>*/}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            onCancel();
            setError("");
          }}
          className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          {initialData ? "Actualizar" : "Agregar"}
        </button>
      </div>
    </form>
  );
}
