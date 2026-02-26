"use client";
import { useState } from "react";

import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Divider,
} from "@heroui/react";
import { Plus, Edit, Trash2, Check, X, Cookie, DollarSign } from "lucide-react";

export default function DishManager({
  dishes,
  categories,
  addDish,
  updateDish,
  deleteDish,
}) {
  const [newDish, setNewDish] = useState({
    name: "",
    price: "",
    category_id: "",
  });
  const [editingDish, setEditingDish] = useState(null);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dishToDelete, setDishToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateDish = (dish) => {
    if (!dish.name.trim()) return "El nombre es requerido";
    if (!dish.category_id) return "La categoría es requerida";
    if (!dish.price || isNaN(dish.price) || parseFloat(dish.price) <= 0)
      return "El precio debe ser un número mayor a 0";
    return "";
  };

  const handleSaveDish = async () => {
    const validationError = validateDish(newDish);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setError("");
      setIsLoading(true);
      await addDish({ ...newDish, price: parseFloat(newDish.price) });
      setNewDish({ name: "", price: "", category_id: "" });
    } catch (err) {
      setError(err.message || "Error al agregar el platillo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDish = async () => {
    const validationError = validateDish(editingDish);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setError("");
      setIsLoading(true);
      await updateDish({
        ...editingDish,
        price: parseFloat(editingDish.price),
      });
      setEditingDish(null);
    } catch (err) {
      setError(err.message || "Error al actualizar el platillo");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = (dish) => {
    setDishToDelete(dish);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await deleteDish(dishToDelete.id);
      setShowDeleteModal(false);
      setDishToDelete(null);
    } catch (err) {
      setError(err.message || "Error al eliminar el platillo");
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (dish) => {
    setEditingDish(dish);
    setError("");
  };

  const cancelEdit = () => {
    setEditingDish(null);
    setError("");
  };

  const handleSelectChange = (value) => {
    setNewDish({ ...newDish, category_id: value });
  };

  const handleEditSelectChange = (value) => {
    setEditingDish({ ...editingDish, category_id: value });
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "Sin categoría";
  };

  return (
    <div className="space-y-6">
      {/* Formulario para nuevo platillo */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <h3 className="text-lg font-bold text-deep flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Platillo
          </h3>
        </CardHeader>
        <CardBody>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-semibold">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                value={newDish.name}
                onChange={(e) => setNewDish({ ...newDish, name: e.target.value })
                }
                placeholder="Nombre del platillo"
                label="Nombre"
                variant="bordered"
                size="lg"
                startContent={<Cookie className="w-4 h-4 text-gray-400" />}
                classNames={{
                  input: "text-base",
                  label: "text-sm font-semibold text-deep",
                }}
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                value={newDish.price}
                onChange={(e) => setNewDish({ ...newDish, price: e.target.value })
                }
                placeholder="0.00"
                label="Precio"
                type="number"
                min="0"
                step="0.01"
                variant="bordered"
                size="lg"
                startContent={<DollarSign className="w-4 h-4 text-gray-400" />}
                classNames={{
                  input: "text-base",
                  label: "text-sm font-semibold text-deep",
                }}
                disabled={isLoading}
              />
            </div>
            <div>
              <Select
                label="Categoría"
                placeholder="Seleccionar"
                selectedKeys={newDish.category_id ? [newDish.category_id] : []}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0];
                  handleSelectChange(selectedKey);
                }}
                variant="bordered"
                size="lg"
                classNames={{
                  label: "text-sm font-semibold text-deep",
                  trigger: "min-h-unit-12",
                  value: "text-base",
                }}
                disabled={isLoading || categories.length === 0}
              >
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>

          <Divider className="my-4" />

          <div className="flex justify-end">
            <Button
              onPress={handleSaveDish}
              variant="solid"
              color="primary"
              size="lg"
              disabled={
                isLoading ||
                !newDish.name.trim() ||
                !newDish.price ||
                !newDish.category_id
              }
              className="gradient-forest text-white min-w-unit-32"
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar Platillo
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Lista de platillos */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <h3 className="text-lg font-bold text-deep flex items-center">
            <Cookie className="w-5 h-5 mr-2" />
            Platillos Existentes ({dishes.length})
          </h3>
        </CardHeader>
        <CardBody>
          {dishes.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dishes.map((dish) => (
                <Card
                  key={dish.id}
                  className="border hover:shadow-md transition-shadow"
                >
                  <CardBody className="p-4">
                    {editingDish?.id === dish.id ? (
                      // Modo edición
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input
                            value={editingDish.name}
                            onChange={(e) => setEditingDish({
                              ...editingDish,
                              name: e.target.value,
                            })
                            }
                            placeholder="Nombre del platillo"
                            variant="bordered"
                            size="md"
                            disabled={isLoading}
                            autoFocus
                          />
                          <Input
                            value={editingDish.price}
                            onChange={(e) => setEditingDish({
                              ...editingDish,
                              price: e.target.value,
                            })
                            }
                            placeholder="Precio"
                            type="number"
                            min="0"
                            step="0.01"
                            variant="bordered"
                            size="md"
                            disabled={isLoading}
                          />
                          <Select
                            selectedKeys={
                              editingDish.category_id
                                ? [editingDish.category_id]
                                : []
                            }
                            onSelectionChange={(keys) => {
                              const selectedKey = Array.from(keys)[0];
                              handleEditSelectChange(selectedKey);
                            }}
                            variant="bordered"
                            size="md"
                            disabled={isLoading}
                          >
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            color="success"
                            size="sm"
                            onPress={handleUpdateDish}
                            disabled={isLoading}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Guardar
                          </Button>
                          <Button
                            variant="outline"
                            color="default"
                            size="sm"
                            onPress={cancelEdit}
                            disabled={isLoading}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Modo vista
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-mint rounded-full flex items-center justify-center">
                            <Cookie className="w-5 h-5 text-forest" />
                          </div>
                          <div>
                            <h4 className="font-bold text-deep text-lg">
                              {dish.name}
                            </h4>
                            <div className="flex items-center space-x-4 text-sm text-forest">
                              <span className="flex items-center">
                                <DollarSign className="w-3 h-3 mr-1" />
                                {dish.price.toFixed(2)}
                              </span>
                              <div className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                {getCategoryName(dish.category_id)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            color="primary"
                            size="sm"
                            onPress={() => startEdit(dish)}
                            disabled={isLoading}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            color="danger"
                            size="sm"
                            onPress={() => confirmDelete(dish)}
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Cookie className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-deep mb-2">
                No hay platillos
              </h3>
              <p className="text-gray-500 mb-6">
                Crea tu primer platillo para comenzar el menú
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal de confirmación */}
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
              ¿Estás seguro de que quieres eliminar el platillo{" "}
              <span className="font-bold">{`"${dishToDelete?.name}"`}</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Esta acción no se puede deshacer y el platillo desaparecerá del
              menú.
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
              onPress={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Eliminando..." : "Eliminar Platillo"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
