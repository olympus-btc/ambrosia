// components/TableManager.js
import { useState } from "react";

// eslint-disable-next-line import/extensions
import { useMock } from "../../contexts/MockSocketContext";

export default function TableManager({ spaceId }) {
  const { tables, addTable, deleteTable, updateTable } = useMock();
  const [newTableName, setNewTableName] = useState("");

  const handleAddTable = () => {
    if (newTableName) {
      addTable(spaceId, newTableName);
      setNewTableName("");
    }
  };

  return (
    <div className="w-1/2 h-full flex flex-col gap-4">
      <h2 className="text-3xl font-bold">Mesas</h2>
      <div className="flex gap-2">
        <input
          value={newTableName}
          onChange={(e) => setNewTableName(e.target.value)}
          className="flex-1 p-4 rounded text-xl"
          placeholder="Nueva mesa"
        />
        <button
          onClick={handleAddTable}
          className="bg-green-500 px-6 py-4 text-white text-xl rounded"
        >
          Agregar
        </button>
      </div>
      <ul className="flex flex-col gap-3 overflow-y-auto">
        {tables.filter((table) => table.spaceId === spaceId).map((table) => (
          <li key={table.id} className="bg-white rounded-xl p-4 flex justify-between items-center text-xl">
            <span>{table.name}</span>
            <div className="flex gap-2">
              <button onClick={() => updateTable(table.id, prompt("Nuevo nombre", table.name))} className="bg-blue-500 text-white px-4 py-2 rounded text-lg">Editar</button>
              <button onClick={() => deleteTable(table.id)} className="bg-red-500 text-white px-4 py-2 rounded text-lg">Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
