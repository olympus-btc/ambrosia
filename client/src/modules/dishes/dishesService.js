//import { apiClient } from "../../services/apiClient";

export async function getDishes() {
  const dishes = await apiClient("/dishes");
  return dishes ? dishes : [];
}

export async function addDish(dish) {
  return await apiClient("/dishes", {
    method: "POST",
    body: dish,
  });
}

export async function updateDish(dish) {
  return await apiClient(`/dishes/${dish.id}`, {
    method: "PUT",
    body: dish,
  });
}

export async function deleteDish(dishId) {
  return await apiClient(`/dishes/${dishId}`, {
    method: "DELETE",
  });
}

export async function getCategories() {
  const categories = await apiClient("/categories?type=dish");
  return categories ? categories : [];
}

export async function addCategory(category) {
  return await apiClient("/categories", {
    method: "POST",
    body: { name: category, type: "dish" },
  });
}

export async function deleteCategory(category) {
  return await apiClient(`/categories/${category}?type=dish`, {
    method: "DELETE",
  });
}

export async function updateCategory(id, name) {
  return await apiClient(`/categories/${id}`, {
    method: "PUT",
    body: { name, type: "dish" },
  });
}
