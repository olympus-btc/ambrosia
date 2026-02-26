"use client";
import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Checkbox,
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
  Shield,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  User,
  Lock,
  Home,
} from "lucide-react";

import { getRoles, addRole, updateRole, deleteRole } from "./authService";

export default function Roles() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [changePassword, setChangePassword] = useState(false);
  const [form, setForm] = useState({ role: "", password: "", isAdmin: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    async function fetchRoles() {
      try {
        setIsLoading(true);
        const response = await getRoles();
        setRoles(response);
      } catch (error) {
        console.error(error.message);
        setError("Error al cargar los roles");
        addToast({
          title: "Error",
          description: "No se pudieron cargar los roles",
          variant: "solid",
          color: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchRoles();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (editing) {
        await updateRole({
          ...form,
          id: editing,
          password: changePassword ? form.password : null,
        });
        addToast({
          title: "Éxito",
          description: "Rol actualizado correctamente",
          variant: "solid",
          color: "success",
        });
      } else {
        await addRole(form);
        addToast({
          title: "Éxito",
          description: "Rol creado correctamente",
          variant: "solid",
          color: "success",
        });
      }
      const response = await getRoles();
      setRoles(response);
      setForm({ role: "", password: "", isAdmin: false });
      setEditing(null);
      setShowPassword(false);
    } catch (err) {
      setError(err.message || "Error al guardar el rol");
      addToast({
        title: "Error",
        description: err.message || "Error al guardar el rol",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (role) => {
    setForm({
      role: role.role,
      password: "",
      isAdmin: role.isAdmin,
    });
    setEditing(role.id);
    setShowPassword(false);
  };

  const cancelEdit = () => {
    setForm({ role: "", password: "", isAdmin: false });
    setEditing(null);
    setShowPassword(false);
    setError("");
  };

  const confirmDelete = (roleId) => {
    setDeleteId(roleId);
    setShowModal(true);
  };

  const handleDelete = async () => {
    setError("");
    setIsLoading(true);
    try {
      await deleteRole(deleteId);
      const response = await getRoles();
      setRoles(response);
      addToast({
        title: "Éxito",
        description: "Rol eliminado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al eliminar el rol");
      addToast({
        title: "Error",
        description: err.message || "Error al eliminar el rol",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
      setShowModal(false);
      setDeleteId(null);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  if (isLoading && roles.length === 0) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardBody className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" color="success" />
            <p className="text-lg font-semibold text-deep mt-4">
              Cargando roles...
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error && roles.length === 0) {
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
                  <Shield className="w-6 h-6 text-forest" />
                </div>
                <h1 className="text-2xl font-bold text-deep">
                  Gestión de Roles
                </h1>
                <p className="text-forest text-sm">
                  {roles.length} {roles.length === 1 ? "rol" : "roles"}{" "}
                  configurados
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
                      Editar Rol
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Nuevo Rol
                    </>
                  )}
                </h3>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    name="role"
                    label="Nombre del Rol"
                    placeholder="Ej: Mesero, Cocinero, Administrador"
                    value={form.role}
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

                  {editing && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        isSelected={changePassword}
                        onValueChange={(checked) => {
                          setChangePassword(checked);
                        }}
                        disabled={isLoading}
                        color="primary"
                      >
                        <span className="text-sm font-medium text-deep">
                          Cambiar Contraseña
                        </span>
                      </Checkbox>
                    </div>
                  )}
                  {editing ? (
                    changePassword && (
                      <Input
                        name="password"
                        label="Contraseña"
                        placeholder="Contraseña para este rol"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange}
                        variant="bordered"
                        size="lg"
                        startContent={
                          <Lock className="w-4 h-4 text-gray-400" />
                        }
                        endContent={(
                          <Button
                            variant="ghost"
                            size="sm"
                            onPress={toggleShowPassword}
                            disabled={isLoading}
                            className="min-w-unit-8 w-unit-8 h-unit-8"
                          >
                            {showPassword ? (
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
                        disabled={!changePassword || isLoading}
                      />
                    )
                  ) : (
                    <Input
                      name="password"
                      label="Contraseña"
                      placeholder="Contraseña para este rol"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      variant="bordered"
                      size="lg"
                      startContent={<Lock className="w-4 h-4 text-gray-400" />}
                      endContent={(
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={toggleShowPassword}
                          disabled={isLoading}
                          className="min-w-unit-8 w-unit-8 h-unit-8"
                        >
                          {showPassword ? (
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
                      disabled={isLoading}
                    />
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      isSelected={form.isAdmin}
                      onValueChange={(checked) => {
                        setForm((prev) => ({
                          ...prev,
                          isAdmin: checked,
                        }));
                      }}
                      disabled={isLoading}
                      color="primary"
                    >
                      <span className="text-sm font-medium text-deep">
                        Permisos de administrador
                      </span>
                    </Checkbox>
                  </div>

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
                        "Actualizar Rol"
                      ) : (
                        "Crear Rol"
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

          {/* Lista de Roles */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <h3 className="text-lg font-bold text-deep flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Roles Existentes
                </h3>
              </CardHeader>
              <CardBody>
                {roles.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {roles.map((role) => (
                      <Card
                        key={role.id}
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
                                    {role.role}
                                  </h4>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-sm text-forest">
                                      Contraseña: ••••••••
                                    </span>
                                    {role.isAdmin && (
                                      <div className="flex items-center bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                                        <Shield className="w-3 h-3 mr-1" />
                                        Admin
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                color="primary"
                                size="sm"
                                onPress={() => startEdit(role)}
                                disabled={isLoading}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                color="danger"
                                size="sm"
                                onPress={() => confirmDelete(role.id)}
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
                    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-deep mb-2">
                      No hay roles configurados
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Crea tu primer rol para comenzar a gestionar permisos
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
                ¿Estás seguro de que quieres eliminar este rol? Esta acción no
                se puede deshacer.
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
                  "Eliminar Rol"
                )}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
