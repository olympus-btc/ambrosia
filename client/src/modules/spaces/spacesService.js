import { apiClient } from "../../services/apiClient";

export async function getRooms() {
  return await apiClient("/spaces");
}

export async function addRoom(room) {
  return await apiClient("/spaces", {
    method: "POST",
    body: room,
  });
}

export async function updateRoom(room) {
  return await apiClient(`/spaces/${room.id}`, {
    method: "PUT",
    body: {
      name: room.name,
    },
  });
}

export async function deleteRoom(roomId) {
  return await apiClient(`/spaces/${roomId}`, {
    method: "DELETE",
  });
}

export async function getTablesByRoomId(roomId) {
  const tables = await apiClient(`/tables/by-space/${roomId}`);
  return tables ? tables : [];
}

export async function getTables() {
  return await apiClient("/tables");
}

export async function addTable(table) {
  return await apiClient("/tables", {
    method: "POST",
    body: table,
  });
}

export async function updateTable(table) {
  return await apiClient(`/tables/${table.id}`, {
    method: "PUT",
    body: table,
  });
}

export async function deleteTable(tableId) {
  return await apiClient(`/tables/${tableId}`, {
    method: "DELETE",
  });
}
