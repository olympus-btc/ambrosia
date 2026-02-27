"use client";
import { useState, useEffect, useCallback } from "react";

import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Divider,
  addToast } from "@heroui/react";
import {
  Table as TableIcon,
  Plus,
  Edit,
  Trash2,
  Users,
  Coffee,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

import {
  addTable,
  updateTable,
  deleteTable,
  getTablesByRoomId,
} from "../../modules/spaces/spacesService";

export default function TableAdmin({ room }) {
  const [tables, setTables] = useState([]);
  const [editingTable, setEditingTable] = useState(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [tableForm, setTableForm] = useState({
    name: "",
    status: "available",
    capacity: "",
  });

  const fetchTables = useCallback(
    async () => {
      try {
        setIsLoading(true);
        const response = await getTablesByRoomId(room.id);
        setTables(Array.isArray(response) ? response : []);
      } catch (err) {
        console.error(err.message);
        setError("Error al cargar las mesas");
        addToast({
          title: "Error",
          description: "No se pudieron cargar las mesas",
          variant: "solid",
          color: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    }, [room]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleAddTable = async () => {
    if (!tableForm.name.trim()) {
      addToast({
        title: "Error",
        description: "El nombre de la mesa es requerido",
        variant: "solid",
        color: "danger",
      });
      return;
    }

    try {
      setIsLoading(true);
      const tableData = {
        name: tableForm.name,
        space_id: room.id,
        // capacity: tableForm.capacity ? parseInt(tableForm.capacity) : null,
      };
      await addTable(tableData);
      await fetchTables();
      setShowTableModal(false);
      setTableForm({ name: "", status: "available", capacity: "" });
      addToast({
        title: "Mesa Creada",
        description: "La mesa se ha creado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al agregar la mesa");
      addToast({
        title: "Error",
        description: err.message || "Error al agregar la mesa",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTable = async () => {
    if (!tableForm.name.trim()) {
      addToast({
        title: "Error",
        description: "El nombre de la mesa es requerido",
        variant: "solid",
        color: "danger",
      });
      return;
    }

    try {
      setIsLoading(true);
      const tableData = {
        ...editingTable,
        id: editingTable.id,
        name: editingTable.name,
        // ...tableForm,
        // capacity: tableForm.capacity ? parseInt(tableForm.capacity) : null,
      };
      await updateTable(tableData);
      await fetchTables();
      setShowTableModal(false);
      setEditingTable(null);
      setTableForm({ name: "", status: "available", capacity: "" });
      addToast({
        title: "Mesa Actualizada",
        description: "La mesa se ha actualizado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al actualizar la mesa");
      addToast({
        title: "Error",
        description: err.message || "Error al actualizar la mesa",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTable = async () => {
    try {
      setIsLoading(true);
      await deleteTable(tableToDelete.id);
      await fetchTables();
      setShowDeleteModal(false);
      setTableToDelete(null);
      addToast({
        title: "Mesa Eliminada",
        description: "La mesa se ha eliminado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al eliminar la mesa");
      addToast({
        title: "Error",
        description: err.message || "Error al eliminar la mesa",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setTableToDelete(null);
    }
  };

  const openEditModal = (table) => {
    setEditingTable(table);
    setTableForm({
      name: table.name,
      status: table.status || "available",
      capacity: table.capacity?.toString() || "",
    });
    setShowTableModal(true);
  };

  const openCreateModal = () => {
    setEditingTable(null);
    setTableForm({ name: "", status: "available", capacity: "" });
    setShowTableModal(true);
  };

  const confirmDelete = (table) => {
    setTableToDelete(table);
    setShowDeleteModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "success";
      case "occupied":
        return "danger";
      case "reserved":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "available":
        return "Disponible";
      case "occupied":
        return "Ocupada";
      case "reserved":
        return "Reservada";
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "available":
        return <CheckCircle className="w-3 h-3" />;
      case "occupied":
        return <AlertCircle className="w-3 h-3" />;
      case "reserved":
        return <Clock className="w-3 h-3" />;
      default:
        return <TableIcon className="w-3 h-3" />;
    }
  };

  if (isLoading && tables.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="flex flex-col items-center">
          <Spinner size="lg" color="success" />
          <p className="text-lg font-semibold text-deep mt-4">
            Cargando mesas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardBody>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Header de la sala */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Coffee className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-deep">
                  Mesas de {room.name}
                </h3>
                <p className="text-forest text-sm">
                  {tables.length} {tables.length === 1 ? "mesa" : "mesas"}{" "}
                  configuradas
                </p>
              </div>
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
              Nueva Mesa
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de mesas */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <h4 className="text-lg font-bold text-deep flex items-center">
            <TableIcon className="w-5 h-5 mr-2" />
            Mesas Configuradas
          </h4>
        </CardHeader>
        <CardBody>
          {tables.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map((table) => (
                <Card
                  key={table.id}
                  className="border hover:shadow-md transition-shadow"
                >
                  <CardBody className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-mint rounded-full flex items-center justify-center">
                          <TableIcon className="w-5 h-5 text-forest" />
                        </div>
                        <div>
                          <h5 className="font-bold text-deep text-lg">
                            {table.name}
                          </h5>
                          {table.capacity && (
                            <div className="flex items-center space-x-1 text-sm text-forest">
                              <Users className="w-3 h-3" />
                              <span>{table.capacity} personas</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <Chip
                        color={getStatusColor(table.status)}
                        variant="flat"
                        startContent={getStatusIcon(table.status)}
                        size="sm"
                      >
                        {getStatusText(table.status)}
                      </Chip>
                    </div>

                    <Divider className="my-3" />

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        ID: {table.id.substring(0, 8)}...
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          color="primary"
                          size="sm"
                          onPress={() => openEditModal(table)}
                          disabled={isLoading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          color="danger"
                          size="sm"
                          onPress={() => confirmDelete(table)}
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
              <TableIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-deep mb-2">
                No hay mesas configuradas
              </h3>
              <p className="text-gray-500 mb-6">
                Agrega tu primera mesa para comenzar a organizar el espacio de{" "}
                {room.name}
              </p>
              <Button
                variant="solid"
                color="primary"
                onPress={openCreateModal}
                className="gradient-forest text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Mesa
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal de Mesa */}
      <Modal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        size="lg"
        className="bg-white"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center space-x-2">
              {editingTable ? (
                <>
                  <Edit className="w-5 h-5 text-forest" />
                  <span>Editar Mesa</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-forest" />
                  <span>Nueva Mesa</span>
                </>
              )}
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Nombre de la Mesa"
                placeholder="Ej: Mesa 1, Mesa VIP, Mesa Terraza"
                value={tableForm.name}
                onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })
                }
                variant="bordered"
                size="lg"
                startContent={<TableIcon className="w-4 h-4 text-gray-400" />}
                classNames={{
                  input: "text-base",
                  label: "text-sm font-semibold text-deep",
                }}
                required
              />
              {/* <Input
                label="Capacidad (opcional)"
                placeholder="Número de personas"
                type="number"
                value={tableForm.capacity}
                onChange={(e) =>
                  setTableForm({ ...tableForm, capacity: e.target.value })
                }
                variant="bordered"
                size="lg"
                startContent={<Users className="w-4 h-4 text-gray-400" />}
                classNames={{
                  input: "text-base",
                  label: "text-sm font-semibold text-deep",
                }}
              />
              <Select
                label="Estado Inicial"
                selectedKeys={[tableForm.status]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0];
                  setTableForm({ ...tableForm, status: value });
                }}
                variant="bordered"
                size="lg"
                classNames={{
                  label: "text-sm font-semibold text-deep",
                  trigger: "min-h-unit-12",
                  value: "text-base",
                }}
              >
                <SelectItem key="available" value="available">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Disponible</span>
                  </div>
                </SelectItem>
                <SelectItem key="occupied" value="occupied">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Ocupada</span>
                  </div>
                </SelectItem>
                <SelectItem key="reserved" value="reserved">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span>Reservada</span>
                  </div>
                </SelectItem>
              </Select>*/}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              color="default"
              onPress={() => setShowTableModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="solid"
              color="primary"
              onPress={editingTable ? handleUpdateTable : handleAddTable}
              disabled={isLoading || !tableForm.name.trim()}
              className="gradient-forest text-white"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Spinner size="sm" color="white" />
                  <span>{editingTable ? "Actualizando..." : "Creando..."}</span>
                </div>
              ) : editingTable ? (
                "Actualizar Mesa"
              ) : (
                "Crear Mesa"
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de Confirmación de Eliminación */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span>Confirmar Eliminación</span>
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-deep">
              ¿Estás seguro de que quieres eliminar la mesa{" "}
              <span className="font-bold">{`"${tableToDelete?.name}"`}</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Esta acción no se puede deshacer. Si la mesa tiene órdenes
              activas, podrían verse afectadas.
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
              onPress={handleDeleteTable}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Spinner size="sm" color="white" />
                  <span>Eliminando...</span>
                </div>
              ) : (
                "Eliminar Mesa"
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
