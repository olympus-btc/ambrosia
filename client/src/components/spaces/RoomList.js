export default function RoomList({ rooms, onSelect, onEdit, onDelete, selectedRoomId }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Salas</h2>
      {rooms.length === 0 ? (
        <p className="text-gray-500">No hay salas disponibles</p>
      ) : (
        <ul className="space-y-2">
          {rooms.map((room) => (
            <li
              key={room.id}
              className={`p-2 border rounded flex justify-between items-center${
                                selectedRoomId === room.id ? "bg-yellow-200" : "bg-white"
                            }`}
            >
              <span className="font-medium">{room.name}</span>
              <div className="flex gap-2">
                <button
                  className="px-2 py-1 bg-blue-500 text-white rounded text-sm cursor-pointer"
                  onClick={() => onSelect(room.id)}
                >
                  Gestionar Mesas
                </button>
                <button
                  className="px-2 py-1 bg-blue-500 text-white rounded text-sm cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(room);
                  }}
                >
                  Editar
                </button>
                <button
                  className="px-2 py-1 bg-red-500 text-white rounded text-sm cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(room.id);
                  }}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
