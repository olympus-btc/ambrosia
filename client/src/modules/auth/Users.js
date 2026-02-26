"use client";
import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Select,
  SelectItem,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Divider,
  addToast } from "@heroui/react";
import {
  ChefHat,
  Users as UsersIcon,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  User,
  Hash,
  Shield,
  Home,
} from "lucide-react";

import {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  getRoles,
} from "./authService";

export default function Users() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", pin: "", role: "" });
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [usersResponse, rolesResponse] = await Promise.all([
          getUsers(),
          getRoles(),
        ]);
        setUsers(usersResponse);
        setRoles(rolesResponse);
      } catch (error) {
        console.error(error.message);
        setError("Error al cargar los datos");
        addToast({
          title: "Error",
          description: "No se pudieron cargar los datos",
          variant: "solid",
          color: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "pin" ? value.replace(/\D/g, "").slice(0, 6) : value,
    }));
  };

  const handleSelectChange = (value) => {
    setForm((prev) => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const pinAsInt = parseInt(form.pin, 10);
      if (isNaN(pinAsInt) || form.pin.length < 4) {
        throw new Error("El PIN debe tener al menos 4 dígitos");
      }

      const userData = { ...form, pin: form.pin.toString() };

      if (editing) {
        await updateUser({ ...userData, id: editing });
        addToast({
          title: "Éxito",
          description: "Usuario actualizado correctamente",
          variant: "solid",
          color: "success",
        });
      } else {
        await addUser(userData);
        addToast({
          title: "Éxito",
          description: "Usuario creado correctamente",
          variant: "solid",
          color: "success",
        });
      }

      const response = await getUsers();
      setUsers(response);
      setForm({ name: "", pin: "", role: "" });
      setEditing(null);
      setShowPin(false);
    } catch (err) {
      setError(err.message || "Error al guardar el usuario");
      addToast({
        title: "Error",
        description: err.message || "Error al guardar el usuario",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (user) => {
    setForm({
      name: user.name,
      pin: user.pin.toString(),
      role: user.role,
    });
    setEditing(user.id);
    setShowPin(false);
    setError("");
  };

  const cancelEdit = () => {
    setForm({ name: "", pin: "", role: "" });
    setEditing(null);
    setShowPin(false);
    setError("");
  };

  const confirmDelete = (userId) => {
    setDeleteId(userId);
    setShowModal(true);
  };

  const handleDelete = async () => {
    setError("");
    setIsLoading(true);

    try {
      await deleteUser(deleteId);
      const response = await getUsers();
      setUsers(response);
      addToast({
        title: "Éxito",
        description: "Usuario eliminado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al eliminar el usuario");
      addToast({
        title: "Error",
        description: err.message || "Error al eliminar el usuario",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
      setShowModal(false);
      setDeleteId(null);
    }
  };

  const toggleShowPin = () => {
    setShowPin((prev) => !prev);
  };

  const getRoleName = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    return role ? role.role : "Sin rol";
  };

  const isRoleAdmin = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    return role ? role.isAdmin : false;
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardBody className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" color="success" />
            <p className="text-lg font-semibold text-deep mt-4">
              Cargando usuarios...
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-red-600" />
            </div>
          </CardHeader>
          <CardBody className="text-center">
            <h2 className="text-xl font-bold text-deep mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button
              variant="outline"
              color="primary"
              onPress={() => window.location.reload()}
              className="w-full"
            >
              Intentar de nuevo
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-fresh p-4">
      <div className="max-w-6xl mx-auto">
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
                <div className="w-12 h-12 bg-mint rounded-full flex items-center justify-center mb-2">
                  <UsersIcon className="w-6 h-6 text-forest" />
                </div>
                <h1 className="text-2xl font-bold text-deep">
                  Gestión de Usuarios
                </h1>
                <p className="text-forest text-sm">
                  {users.length} {users.length === 1 ? "usuario" : "usuarios"}{" "}
                  registrados
                </p>
              </div>
              <div className="w-20" />
            </div>
          </CardHeader>
        </Card>

        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardBody>
              <p className="text-red-600 text-center font-semibold">{error}</p>
            </CardBody>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0 bg-white sticky top-4">
              <CardHeader>
                <h3 className="text-lg font-bold text-deep flex items-center">
                  {editing ? (
                    <>
                      <Edit className="w-5 h-5 mr-2" />
                      Editar Usuario
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Nuevo Usuario
                    </>
                  )}
                </h3>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    name="name"
                    label="Nombre del Usuario"
                    placeholder="Ej: Juan Pérez"
                    value={form.name}
                    onChange={handleChange}
                    variant="bordered"
                    size="lg"
                    startContent={<User className="w-4 h-4 text-gray-400" />}
                    classNames={{
                      input: "text-base",
                      label: "text-sm font-semibold text-deep",
                    }}
                    required
                    disabled={isLoading}
                  />

                  <Select
                    aria-label="Rol del Usuario"
                    label="Rol del Usuario"
                    placeholder="Selecciona un rol"
                    selectedKeys={form.role ? [form.role] : []}
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0];
                      handleSelectChange(selectedKey);
                    }}
                    variant="bordered"
                    size="lg"
                    startContent={<Shield className="w-4 h-4 text-gray-400" />}
                    classNames={{
                      label: "text-sm font-semibold text-deep",
                      trigger: "min-h-unit-12",
                      value: "text-base",
                    }}
                    required
                    disabled={isLoading || roles.length === 0}
                  >
                    {roles.map((role) => (
                      <SelectItem
                        key={role.id}
                        value={role.id}
                        aria-label={role.role}
                      >
                        <div className="flex items-center space-x-2">
                          <span>{role.role}</span>
                          {role.isAdmin && (
                            <div className="flex items-center bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </Select>

                  <Input
                    name="pin"
                    label="PIN de Acceso"
                    placeholder="4 dígitos"
                    type={showPin ? "text" : "password"}
                    value={form.pin}
                    onChange={handleChange}
                    variant="bordered"
                    size="lg"
                    maxLength={4}
                    startContent={<Hash className="w-4 h-4 text-gray-400" />}
                    endContent={(
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={toggleShowPin}
                        disabled={isLoading}
                        className="min-w-unit-8 w-unit-8 h-unit-8"
                      >
                        {showPin ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                    )}
                    classNames={{
                      input: "text-base",
                      label: "text-sm font-semibold text-deep",
                    }}
                    required
                    disabled={isLoading}
                    description="Solo números, mínimo 4 dígitos"
                  />

                  <Divider />

                  <div className="flex space-x-3">
                    <Button
                      type="submit"
                      variant="solid"
                      color="primary"
                      size="lg"
                      disabled={isLoading}
                      className="flex-1 gradient-forest text-white"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Spinner size="sm" color="white" />
                          <span>Guardando...</span>
                        </div>
                      ) : editing ? (
                        "Actualizar Usuario"
                      ) : (
                        "Crear Usuario"
                      )}
                    </Button>

                    {editing && (
                      <Button
                        variant="outline"
                        color="default"
                        size="lg"
                        onPress={cancelEdit}
                        disabled={isLoading}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>

          {/* Lista de Usuarios */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <h3 className="text-lg font-bold text-deep flex items-center">
                  <UsersIcon className="w-5 h-5 mr-2" />
                  Usuarios Registrados
                </h3>
              </CardHeader>
              <CardBody>
                {users.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {users.map((user) => (
                      <Card
                        key={user.id}
                        className="border hover:shadow-md transition-shadow"
                      >
                        <CardBody className="p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-mint rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-forest" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-deep text-lg">
                                    {user.name}
                                  </h4>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-sm text-forest">
                                      PIN: ••••••
                                    </span>
                                    <div className="flex items-center space-x-1">
                                      <span className="text-sm text-forest">
                                        Rol:
                                      </span>
                                      <div
                                        className={`flex items-center px-2 py-1 rounded-full text-xs ${
                                          isRoleAdmin(user.role)
                                            ? "bg-purple-100 text-purple-800"
                                            : "bg-blue-100 text-blue-800"
                                        }`}
                                      >
                                        <Shield className="w-3 h-3 mr-1" />
                                        {getRoleName(user.role)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                color="primary"
                                size="sm"
                                onPress={() => startEdit(user)}
                                disabled={isLoading}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                color="danger"
                                size="sm"
                                onPress={() => confirmDelete(user.id)}
                                disabled={isLoading}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-deep mb-2">
                      No hay usuarios registrados
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Crea tu primer usuario para comenzar a gestionar el acceso
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Modal de Confirmación */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <span>Confirmar Eliminación</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <p className="text-deep">
                ¿Estás seguro de que quieres eliminar este usuario? Esta acción
                no se puede deshacer y el usuario perderá acceso al sistema.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="outline"
                color="default"
                onPress={() => setShowModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="solid"
                color="danger"
                onPress={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Spinner size="sm" color="white" />
                    <span>Eliminando...</span>
                  </div>
                ) : (
                  "Eliminar Usuario"
                )}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
