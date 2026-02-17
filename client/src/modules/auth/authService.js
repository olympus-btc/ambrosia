import { httpClient } from "../../lib/http/httpClient";
import { parseJsonResponse } from "../../lib/http/parseJsonResponse";

export async function loginFromService({ name, pin }) {
  const response = await httpClient("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, pin }),
  });
  return await parseJsonResponse(response, null);
}

export async function RefreshToken() {
  const response = await httpClient("/auth/refresh", {
    method: "POST",
  });
  return await parseJsonResponse(response, null);
}

export async function logoutFromService() {
  const response = await httpClient("/auth/logout", {
    method: "POST",
  });
  return await parseJsonResponse(response, null);
}

export async function getRoles() {
  const response = await httpClient("/roles");
  const roles = await parseJsonResponse(response, []);
  return roles ?? [];
}

export async function addRole(role) {
  const response = await httpClient("/roles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(role),
  });
  return await parseJsonResponse(response, null);
}

export async function updateRole(role) {
  const response = await httpClient(`/roles/${role.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(role),
  });
  return await parseJsonResponse(response, null);
}

export async function deleteRole(roleId) {
  const response = await httpClient(`/roles/${roleId}`, {
    method: "DELETE",
  });
  return await parseJsonResponse(response, null);
}

export async function getUsers({ silentAuth = false } = {}) {
  void silentAuth;
  const response = await httpClient("/users");
  const users = await parseJsonResponse(response, []);
  return users ?? [];
}

export async function addUser(user) {
  const response = await httpClient("/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...user, pin: user.pin.toString() }),
  });
  return await parseJsonResponse(response, null);
}

export async function updateUser(user) {
  const response = await httpClient(`/users/${user.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...user, pin: user.pin.toString() }),
  });
  return await parseJsonResponse(response, null);
}

export async function deleteUser(userId) {
  const response = await httpClient(`/users/${userId}`, {
    method: "DELETE",
  });
  return await parseJsonResponse(response, null);
}

export async function getRoleName(roleId) {
  const response = await httpClient(`/roles/${roleId}`);
  const role = await parseJsonResponse(response, null);
  return role?.role ?? null;
}

export const getCookieValue = (name) => {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
};
