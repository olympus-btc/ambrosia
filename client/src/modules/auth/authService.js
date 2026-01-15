import { apiClient } from "../../services/apiClient";

export async function loginFromService({ name, pin }) {
  return await apiClient("/auth/login", {
    method: "POST",
    body: { name, pin },
  });
}

export async function RefreshToken() {
  return await apiClient("/auth/refresh", {
    method: "POST",
  });
}

export async function logoutFromService() {
  return await apiClient("/auth/logout", {
    method: "POST",
  });
}

export async function getRoles() {
  const roles = await apiClient("/roles");
  return roles ? roles : [];
}

export async function addRole(role) {
  return await apiClient("/roles", {
    method: "POST",
    body: role,
  });
}

export async function updateRole(role) {
  return await apiClient(`/roles/${role.id}`, {
    method: "PUT",
    body: role,
  });
}

export async function deleteRole(roleId) {
  return await apiClient(`/roles/${roleId}`, {
    method: "DELETE",
  });
}

export async function getUsers({ silentAuth = false } = {}) {
  const users = await apiClient("/users", { silentAuth });
  return users ? users : [];
}

export async function addUser(user) {
  return await apiClient("/users", {
    method: "POST",
    body: { ...user, pin: user.pin.toString() },
  });
}

export async function updateUser(user) {
  return await apiClient(`/users/${user.id}`, {
    method: "PUT",
    body: { ...user, pin: user.pin.toString() },
  });
}

export async function deleteUser(userId) {
  return await apiClient(`/users/${userId}`, {
    method: "DELETE",
  });
}

export async function getRoleName(roleId) {
  const role = await apiClient(`/roles/${roleId}`);
  return role ? role.role : null;
}

export const getCookieValue = (name) => {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
};
