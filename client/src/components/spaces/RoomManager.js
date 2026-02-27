// components/SpaceManager.js
import { useState } from "react";

// eslint-disable-next-line import/extensions
import { useMock } from "../../contexts/MockSocketContext";

export default function RoomManager() {
  const { rooms, addRoom, deleteRoom, updateRoom } = useMock();
  const [spaceEditValue, setSpaceEditValue] = useState("");
  const [editingSpace, setEditingSpace] = useState(null);

  const handleUpdateSpace = () => {
    if (!spaceEditValue) return;
    updateRoom(editingSpace, spaceEditValue);
    setEditingSpace(null);
    setSpaceEditValue("");
  };

  return (
    <div className="w-1/2 h-full flex flex-col gap-4">
      <h2 className="text-3xl font-bold">Salas</h2>
      <div className="flex gap-2">
        <input
          value={spaceEditValue}
          onChange={(e) => setSpaceEditValue(e.target.value)}
          className="flex-1 p-4 rounded text-xl"
          placeholder="Nueva sala"
        />
        <button
          onClick={() => {
            if (spaceEditValue) addRoom(spaceEditValue);
            setSpaceEditValue("");
          }}
          className="bg-green-500 px-6 py-4 text-white text-xl rounded"
        >
          Agregar
        </button>
      </div>
      <ul className="flex flex-col gap-3 overflow-y-auto">
        {rooms.map((room) => (
          <li key={room.id} className="bg-white rounded-xl p-4 flex justify-between items-center text-xl">
            {editingSpace === room.id ? (
              <>
                <input
                  value={spaceEditValue}
                  onChange={(e) => setSpaceEditValue(e.target.value)}
                  className="flex-1 p-2 mr-4 rounded"
                />
                <button onClick={handleUpdateSpace} className="bg-green-500 text-white px-4 py-2 rounded text-lg mr-2">✔</button>
                <button onClick={() => setEditingSpace(null)} className="bg-gray-400 text-white px-4 py-2 rounded text-lg">✖</button>
              </>
            ) : (
              <>
                <span>{room.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingSpace(room.id); setSpaceEditValue(room.name); }} className="bg-blue-500 text-white px-4 py-2 rounded text-lg">Editar</button>
                  <button onClick={() => deleteRoom(room.id)} className="bg-red-500 text-white px-4 py-2 rounded text-lg">Eliminar</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
