export default function TableList({ tables, onEdit, onDelete }) {
  return (
    <div className="space-y-2">
      {tables.length === 0 ? (
        <p className="text-gray-500">No hay mesas en esta sala.</p>
      ) : (
        tables.map((mesa) => (
          <div key={mesa.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
            <div>
              <p className="font-semibold">{mesa.name}</p>
              <p className="text-sm text-gray-600">Estado: {mesa.status}</p>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => onEdit(mesa)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Editar
              </button>
              <button
                onClick={() => onDelete(mesa.id)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
