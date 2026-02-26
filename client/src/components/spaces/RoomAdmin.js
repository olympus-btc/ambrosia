"use client";
import { useState, useEffect } from "react";

import {
  getRooms,
  addRoom,
  updateRoom,
  deleteRoom,
} from "../../modules/spaces/spacesService";
import LoadingCard from "../LoadingCard";

import RoomForm from "./RoomForm";
import RoomList from "./RoomList";
import TableAdmin from "./TableAdmin";

export default function RoomAdmin() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showingSpaceForm, setShowingSpaceForm] = useState(false);

  useEffect(() => {
    async function fetchRooms() {
      try {
        setIsLoading(true);
        const response = await getRooms();
        setRooms(response);
      } catch (error) {
        console.error(error.message);
        setError("Error al cargar las salas");
      } finally {
        setIsLoading(false);
      }
    }
    fetchRooms();
  }, []);

  const handleAddRoom = async (room) => {
    try {
      setError("");
      await addRoom(room);
      const response = await getRooms();
      setRooms(response);
    } catch (err) {
      setError(err.message || "Error al agregar la sala");
    }
  };

  const handleUpdateRoom = async (room) => {
    try {
      setError("");
      await updateRoom(room);
      const response = await getRooms();
      setRooms(response);
      setEditingRoom(null);
    } catch (err) {
      setError(err.message || "Error al actualizar la sala");
    }
  };

  const handleDeleteRoom = async (id) => {
    try {
      setError("");
      await deleteRoom(id);
      const response = await getRooms();
      setRooms(response);
      if (selectedRoomId === id) setSelectedRoomId(null);
    } catch (err) {
      setError(err.message || "Error al eliminar la sala");
    }
  };

  const selectedRoom = Array.isArray(rooms)
    ? rooms.find((r) => r.id === selectedRoomId) || null
    : [];

  if (isLoading) {
    return <LoadingCard message="Cargando salas..." />;
  }

  if (error && rooms.length === 0) {
    return <div className="p-4 text-2xl text-red-600">{error}</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-6 w-full">
      {error && <p className="text-red-600 text-xl">{error}</p>}
      <div className="flex gap-6">
        <div className="w-1/2">
          <RoomList
            rooms={rooms}
            onSelect={setSelectedRoomId}
            onEdit={(room) => {
              setEditingRoom(room);
              setShowingSpaceForm(true);
            }}
            onDelete={handleDeleteRoom}
            selectedRoomId={selectedRoomId}
          />
        </div>
        <div className="w-1/2">
          {showingSpaceForm ? (
            <>
              <RoomForm
                onSubmit={editingRoom ? handleUpdateRoom : handleAddRoom}
                initialData={editingRoom}
                onCancel={() => {
                  setEditingRoom(null);
                  setShowingSpaceForm(false);
                }}
              />
            </>
          ) : (
            <>
              {/*<h2 className="text-xl font-bold mb-2">

                        </h2>*/}
              <button
                type="button"
                onClick={() => {
                  setShowingSpaceForm(true);
                }}
                className="px-4 py-2 bg-green-400 text-white rounded mt-[40px] cursor-pointer"
              >
                Añadir Sala
              </button>
            </>
          )}
        </div>
      </div>
      {selectedRoom && (
        <div>
          <h2 className="text-xl font-bold mb-2">
            Mesas en: {selectedRoom.name}
          </h2>
          <TableAdmin room={selectedRoom} />
        </div>
      )}
    </div>
  );
}
