"use client";
import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Tabs,
  Tab,
  addToast } from "@heroui/react";
import {
  ChefHat,
  Utensils,
  Home,
  Cookie,
  Tags,
} from "lucide-react";

import CategoryManager from "./CategoryManager";
import {
  getDishes,
  addDish,
  updateDish,
  deleteDish,
  getCategories,
  addCategory,
  deleteCategory,
  updateCategory,
} from "./dishesService";
import DishManager from "./DishManager";

export default function Dishes() {
  const router = useRouter();
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("categories");

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [dishesResponse, categoriesResponse] = await Promise.all([
          getDishes(),
          getCategories(),
        ]);
        setDishes(dishesResponse);
        setCategories(categoriesResponse);
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

  const handleAddCategory = async (category) => {
    try {
      setError("");
      await addCategory(category);
      const response = await getCategories();
      setCategories(response);
      addToast({
        title: "Éxito",
        description: "Categoría creada correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al agregar la categoría");
      addToast({
        title: "Error",
        description: err.message || "Error al agregar la categoría",
        variant: "solid",
        color: "danger",
      });
    }
  };

  const handleDeleteCategory = async (category) => {
    try {
      setError("");
      await deleteCategory(category);
      const [dishesResponse, categoriesResponse] = await Promise.all([
        getDishes(),
        getCategories(),
      ]);
      setDishes(dishesResponse);
      setCategories(categoriesResponse);
      addToast({
        title: "Éxito",
        description: "Categoría eliminada correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al eliminar la categoría");
      addToast({
        title: "Error",
        description: err.message || "Error al eliminar la categoría",
        variant: "solid",
        color: "danger",
      });
    }
  };

  const handleUpdateCategory = async (id, newName) => {
    try {
      setError("");
      await updateCategory(id, newName);
      const [dishesResponse, categoriesResponse] = await Promise.all([
        getDishes(),
        getCategories(),
      ]);
      setDishes(dishesResponse);
      setCategories(categoriesResponse);
      addToast({
        title: "Éxito",
        description: "Categoría actualizada correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al actualizar la categoría");
      addToast({
        title: "Error",
        description: err.message || "Error al actualizar la categoría",
        variant: "solid",
        color: "danger",
      });
    }
  };

  const handleAddDish = async (dish) => {
    try {
      setError("");
      await addDish(dish);
      const response = await getDishes();
      setDishes(response);
      addToast({
        title: "Éxito",
        description: "Platillo creado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al agregar el platillo");
      addToast({
        title: "Error",
        description: err.message || "Error al agregar el platillo",
        variant: "solid",
        color: "danger",
      });
    }
  };

  const handleUpdateDish = async (dish) => {
    try {
      setError("");
      await updateDish(dish);
      const response = await getDishes();
      setDishes(response);
      addToast({
        title: "Éxito",
        description: "Platillo actualizado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al actualizar el platillo");
      addToast({
        title: "Error",
        description: err.message || "Error al actualizar el platillo",
        variant: "solid",
        color: "danger",
      });
    }
  };

  const handleDeleteDish = async (dishId) => {
    try {
      setError("");
      await deleteDish(dishId);
      const response = await getDishes();
      setDishes(response);
      addToast({
        title: "Éxito",
        description: "Platillo eliminado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      setError(err.message || "Error al eliminar el platillo");
      addToast({
        title: "Error",
        description: err.message || "Error al eliminar el platillo",
        variant: "solid",
        color: "danger",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardBody className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" color="success" />
            <p className="text-lg font-semibold text-deep mt-4">
              Cargando platillos y categorías...
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error && dishes.length === 0 && categories.length === 0) {
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
                <div className="w-12 h-12 bg-mint rounded-full flex items-center justify-center mb-2">
                  <Utensils className="w-6 h-6 text-forest" />
                </div>
                <h1 className="text-2xl font-bold text-deep">
                  Gestión de Platillos
                </h1>
                <p className="text-forest text-sm">
                  {categories.length} categorías • {dishes.length} platillos
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

        {/* Tabs Navigation */}
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
                key="categories"
                title={(
                  <div className="flex items-center space-x-2">
                    <Tags className="w-4 h-4" />
                    <span>Categorías</span>
                    <div className="bg-mint text-forest rounded-full px-2 py-0.5 text-xs font-medium">
                      {categories.length}
                    </div>
                  </div>
                )}
              />
              <Tab
                key="dishes"
                title={(
                  <div className="flex items-center space-x-2">
                    <Cookie className="w-4 h-4" />
                    <span>Platillos</span>
                    <div className="bg-mint text-forest rounded-full px-2 py-0.5 text-xs font-medium">
                      {dishes.length}
                    </div>
                  </div>
                )}
              />
            </Tabs>
          </CardBody>
        </Card>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === "categories" && (
            <CategoryManager
              categories={categories}
              addCategory={handleAddCategory}
              deleteCategory={handleDeleteCategory}
              updateCategory={handleUpdateCategory}
            />
          )}

          {activeTab === "dishes" && (
            <DishManager
              dishes={dishes}
              categories={categories}
              addDish={handleAddDish}
              updateDish={handleUpdateDish}
              deleteDish={handleDeleteDish}
            />
          )}
        </div>
      </div>
    </div>
  );
}
