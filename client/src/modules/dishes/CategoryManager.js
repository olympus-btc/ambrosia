"use client";
import { useState } from "react";

import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Plus, Edit, Trash2, Check, X, Tags } from "lucide-react";

export default function CategoryManager({
  categories,
  addCategory,
  deleteCategory,
  updateCategory,
}) {
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryEditValue, setCategoryEditValue] = useState("");
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      setError("La categoría no puede estar vacía");
      return;
    }
    try {
      setError("");
      setIsLoading(true);
      await addCategory(newCategory.trim());
      setNewCategory("");
    } catch (err) {
      setError(err.message || "Error al agregar la categoría");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!categoryEditValue.trim()) {
      setError("La categoría no puede estar vacía");
      return;
    }
    try {
      setError("");
      setIsLoading(true);
      await updateCategory(editingCategory.id, categoryEditValue.trim());
      setEditingCategory(null);
      setCategoryEditValue("");
    } catch (err) {
      setError(err.message || "Error al actualizar la categoría");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = (category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await deleteCategory(categoryToDelete.id);
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    } catch (err) {
      setError(err.message || "Error al eliminar la categoría");
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (category) => {
    setEditingCategory(category);
    setCategoryEditValue(category.name);
    setError("");
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setCategoryEditValue("");
    setError("");
  };

  return (
    <div className="space-y-6">
      {/* Formulario para nueva categoría */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <h3 className="text-lg font-bold text-deep flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Nueva Categoría
          </h3>
        </CardHeader>
        <CardBody>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-semibold">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Nombre de la categoría"
              variant="bordered"
              size="lg"
              startContent={<Tags className="w-4 h-4 text-gray-400" />}
              classNames={{
                input: "text-base",
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleAddCategory();
                }
              }}
              disabled={isLoading}
            />
            <Button
              onPress={handleAddCategory}
              variant="solid"
              color="primary"
              size="lg"
              disabled={isLoading || !newCategory.trim()}
              className="gradient-forest text-white min-w-unit-24"
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Lista de categorías */}
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader>
          <h3 className="text-lg font-bold text-deep flex items-center">
            <Tags className="w-5 h-5 mr-2" />
            Categorías Existentes ({categories.length})
          </h3>
        </CardHeader>
        <CardBody>
          {categories.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className="border hover:shadow-md transition-shadow"
                >
                  <CardBody className="p-4">
                    {editingCategory?.id === category.id ? (
                      // Modo edición
                      <div className="flex items-center space-x-3">
                        <Input
                          value={categoryEditValue}
                          onChange={(e) => setCategoryEditValue(e.target.value)}
                          variant="bordered"
                          size="md"
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleUpdateCategory();
                            }
                            if (e.key === "Escape") {
                              cancelEdit();
                            }
                          }}
                          disabled={isLoading}
                          autoFocus
                        />
                        <Button
                          variant="outline"
                          color="success"
                          size="sm"
                          onPress={handleUpdateCategory}
                          disabled={isLoading || !categoryEditValue.trim()}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          color="default"
                          size="sm"
                          onPress={cancelEdit}
                          disabled={isLoading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      // Modo vista
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-mint rounded-full flex items-center justify-center">
                            <Tags className="w-4 h-4 text-forest" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-deep text-base">
                              {category.name}
                            </h4>
                            <p className="text-sm text-forest">
                              ID: {category.id}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            color="primary"
                            size="sm"
                            onPress={() => startEdit(category)}
                            disabled={isLoading}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            color="danger"
                            size="sm"
                            onPress={() => confirmDelete(category)}
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
              <Tags className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-deep mb-2">
                No hay categorías
              </h3>
              <p className="text-gray-500 mb-6">
                Crea tu primera categoría para organizar los platillos
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
              ¿Estás seguro de que quieres eliminar la categoría{" "}
              <span className="font-bold">{`"${categoryToDelete?.name}"`}</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Esta acción no se puede deshacer y puede afectar los platillos
              asociados a esta categoría.
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
              {isLoading ? "Eliminando..." : "Eliminar Categoría"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
