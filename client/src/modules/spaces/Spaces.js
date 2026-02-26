"use client";
import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Divider,
  Tabs,
  Tab,
  addToast } from "@heroui/react";
import {
  Building,
  Plus,
  Edit,
  Trash2,
  Eye,
  Home,
  Table,
  Users,
  MapPin,
} from "lucide-react";

import TableAdmin from "../../components/spaces/TableAdmin";

import { getRooms, addRoom, updateRoom, deleteRoom } from "./spacesService";

export default function Spaces() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("rooms");
  const [roomForm, setRoomForm] = useState({
    name: "",
    description: "",
    capacity: "",
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const response = await getRooms();
      setRooms(response);
    } catch (error) {
      console.error(error.message);
      setError("Error al cargar las salas");
      addToast({
        title: "Error",
        description: "No se pudieron cargar las salas",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRoom = async () => {
    if (!roomForm.name.trim()) {
      addToast({
        title: "Error",
        description: "El nombre de la sala es requerido",
        variant: "solid",
        color: "danger",
      });
      return;
    }

    try {
      setIsLoading(true);
      const roomData = {
        ...roomForm,
        capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null,
      };
      await addRoom({ name: roomData.name });
      await fetchRooms();
      setShowRoomModal(false);
      setRoomForm({ name: "", description: "", capacity: "" });
      addToast({
        title: "Sala Creada",
        description: "La sala se ha creado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al agregar la sala");
      addToast({
        title: "Error",
        description: err.message || "Error al agregar la sala",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRoom = async () => {
    if (!roomForm.name.trim()) {
      addToast({
        title: "Error",
        description: "El nombre de la sala es requerido",
        variant: "solid",
        color: "danger",
      });
      return;
    }

    try {
      setIsLoading(true);
      const roomData = {
        ...editingRoom,
        ...roomForm,
        capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null,
      };
      await updateRoom(roomData);
      await fetchRooms();
      setShowRoomModal(false);
      setEditingRoom(null);
      setRoomForm({ name: "", description: "", capacity: "" });
      addToast({
        title: "Sala Actualizada",
        description: "La sala se ha actualizado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al actualizar la sala");
      addToast({
        title: "Error",
        description: err.message || "Error al actualizar la sala",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    try {
      setIsLoading(true);
      await deleteRoom(roomToDelete.id);
      await fetchRooms();
      if (selectedRoomId === roomToDelete.id) {
        setSelectedRoomId(null);
      }
      setShowDeleteModal(false);
      setRoomToDelete(null);
      addToast({
        title: "Sala Eliminada",
        description: "La sala se ha eliminado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al eliminar la sala");
      addToast({
        title: "Error",
        description: err.message || "Error al eliminar la sala",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setRoomToDelete(null);
    }
  };

  const openEditModal = (room) => {
    setEditingRoom(room);
    setRoomForm({
      name: room.name,
      description: room.description || "",
      capacity: room.capacity?.toString() || "",
    });
    setShowRoomModal(true);
  };

  const openCreateModal = () => {
    setEditingRoom(null);
    setRoomForm({ name: "", description: "", capacity: "" });
    setShowRoomModal(true);
  };

  const confirmDelete = (room) => {
    setRoomToDelete(room);
    setShowDeleteModal(true);
  };

  const selectedRoom = selectedRoomId
    ? rooms.find((r) => r.id === selectedRoomId)
    : null;

  if (isLoading && rooms.length === 0) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardBody className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" color="success" />
            <p className="text-lg font-semibold text-deep mt-4">
              Cargando espacios...
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-fresh p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-6 shadow-lg border-0 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                onPress={() => router.push("/")}
                className="text-forest hover:bg-mint/20"
              >
                <Home className="w-5 h-5 mr-2" />
                Inicio
              </Button>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                  <Building className="w-6 h-6 text-purple-600" />
                </div>
                <h1 className="text-2xl font-bold text-deep">
                  Administrar Espacios
                </h1>
                <p className="text-forest text-sm">
                  Gestión de salas y mesas del restaurante
                </p>
              </div>
              <Button
                variant="solid"
                color="primary"
                size="lg"
                onPress={openCreateModal}
                className="gradient-forest text-white"
                disabled={isLoading}
              >
                <Plus className="w-5 h-5 mr-2" />
                Nueva Sala
              </Button>
            </div>
          </CardHeader>
        </Card>

        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardBody>
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <p className="text-red-600 font-semibold">{error}</p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Tabs */}
        <Card className="mb-6 shadow-lg border-0 bg-white">
          <CardBody className="p-0">
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={setActiveTab}
              variant="underlined"
              classNames={{
                tabList:
                  "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                cursor: "w-full bg-forest",
                tab: "max-w-fit px-6 py-4 h-12",
                tabContent: "group-data-[selected=true]:text-forest",
              }}
            >
              <Tab
                key="rooms"
                title={(
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4" />
                    <span>Salas</span>
                    <div className="bg-purple-100 text-purple-800 rounded-full px-2 py-0.5 text-xs font-medium">
                      {rooms.length}
                    </div>
                  </div>
                )}
              />
              <Tab
                key="tables"
                title={(
                  <div className="flex items-center space-x-2">
                    <Table className="w-4 h-4" />
                    <span>Mesas</span>
                    {selectedRoom && (
                      <div className="bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs font-medium">
                        {selectedRoom.name}
                      </div>
                    )}
                  </div>
                )}
              />
            </Tabs>
          </CardBody>
        </Card>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === "rooms" && (
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <h3 className="text-lg font-bold text-deep flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Salas del Restaurante ({rooms.length})
                </h3>
              </CardHeader>
              <CardBody>
                {rooms.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map((room) => (
                      <Card
                        key={room.id}
                        className="border hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <CardBody className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <Building className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <h4 className="font-bold text-deep text-lg">
                                  {room.name}
                                </h4>
                                {room.description && (
                                  <p className="text-sm text-forest">
                                    {room.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {room.capacity && (
                            <div className="flex items-center space-x-1 text-sm text-forest mb-3">
                              <Users className="w-3 h-3" />
                              <span>Capacidad: {room.capacity} personas</span>
                            </div>
                          )}

                          <Divider className="my-3" />

                          <div className="flex justify-between items-center">
                            <Button
                              variant="outline"
                              color="primary"
                              size="sm"
                              onPress={() => {
                                setSelectedRoomId(room.id);
                                setActiveTab("tables");
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver Mesas
                            </Button>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                color="primary"
                                size="sm"
                                onPress={() => {
                                  openEditModal(room);
                                }}
                                disabled={isLoading}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                color="danger"
                                size="sm"
                                onPress={(e) => {
                                  e.stopPropagation();
                                  confirmDelete(room);
                                }}
                                disabled={isLoading}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-deep mb-2">
                      No hay salas configuradas
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Crea tu primera sala para comenzar a organizar el espacio
                      del restaurante
                    </p>
                    <Button
                      variant="solid"
                      color="primary"
                      onPress={openCreateModal}
                      className="gradient-forest text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Primera Sala
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {activeTab === "tables" && (
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <div className="flex justify-between items-center w-full">
                  <h3 className="text-lg font-bold text-deep flex items-center">
                    <Table className="w-5 h-5 mr-2" />
                    {selectedRoom
                      ? `Mesas de ${selectedRoom.name}`
                      : "Selecciona una Sala"}
                  </h3>
                  {selectedRoom && (
                    <Button
                      variant="outline"
                      color="primary"
                      onPress={() => setActiveTab("rooms")}
                    >
                      <Building className="w-4 h-4 mr-2" />
                      Volver a Salas
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                {selectedRoom ? (
                  <TableAdmin room={selectedRoom} />
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-deep mb-2">
                      Selecciona una Sala
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Elige una sala para ver y gestionar sus mesas
                    </p>
                    <Button
                      variant="outline"
                      color="primary"
                      onPress={() => setActiveTab("rooms")}
                    >
                      <Building className="w-4 h-4 mr-2" />
                      Ver Salas
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Modal de Sala */}
        <Modal
          isOpen={showRoomModal}
          onClose={() => setShowRoomModal(false)}
          className="bg-white ring-2 ring-gray-300 shadow-2xl"
          size="lg"
          backdrop="blur"
        >
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center space-x-2">
                {editingRoom ? (
                  <>
                    <Edit className="w-5 h-5 text-forest" />
                    <span>Editar Sala</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-forest" />
                    <span>Nueva Sala</span>
                  </>
                )}
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <Input
                  label="Nombre de la Sala"
                  placeholder="Ej: Salón Principal, Terraza, VIP"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })
                  }
                  variant="bordered"
                  size="lg"
                  startContent={<Building className="w-4 h-4 text-gray-400" />}
                  classNames={{
                    input: "text-base",
                    label: "text-sm font-semibold text-deep",
                  }}
                  required
                />
                <Textarea
                  label="Descripción (opcional)"
                  placeholder="Descripción de la sala..."
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })
                  }
                  variant="bordered"
                  size="lg"
                  classNames={{
                    input: "text-base",
                    label: "text-sm font-semibold text-deep",
                  }}
                />
                <Input
                  label="Capacidad (opcional)"
                  placeholder="Número de personas"
                  type="number"
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })
                  }
                  variant="bordered"
                  size="lg"
                  startContent={<Users className="w-4 h-4 text-gray-400" />}
                  classNames={{
                    input: "text-base",
                    label: "text-sm font-semibold text-deep",
                  }}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="outline"
                color="default"
                onPress={() => setShowRoomModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="solid"
                color="primary"
                onPress={editingRoom ? handleUpdateRoom : handleAddRoom}
                disabled={isLoading || !roomForm.name.trim()}
                className="gradient-forest text-white"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Spinner size="sm" color="white" />
                    <span>
                      {editingRoom ? "Actualizando..." : "Creando..."}
                    </span>
                  </div>
                ) : editingRoom ? (
                  "Actualizar Sala"
                ) : (
                  "Crear Sala"
                )}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal de Confirmación de Eliminación */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
        >
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <span>Confirmar Eliminación</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <p className="text-deep">
                ¿Estás seguro de que quieres eliminar la sala{" "}
                <span className="font-bold">{`"${roomToDelete?.name}"`}</span>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Esta acción no se puede deshacer y también eliminará todas las
                mesas asociadas a esta sala.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="outline"
                color="default"
                onPress={() => setShowDeleteModal(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="solid"
                color="danger"
                onPress={handleDeleteRoom}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Spinner size="sm" color="white" />
                    <span>Eliminando...</span>
                  </div>
                ) : (
                  "Eliminar Sala"
                )}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
