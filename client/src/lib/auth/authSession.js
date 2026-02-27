import { httpClient, parseJsonResponse } from "@/lib/http";

export async function getCurrentSession() {
  const response = await httpClient("/users/me");
  const data = await parseJsonResponse(response, null);

  if (!response.ok) {
    const message = data?.message || "Failed to fetch session";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return {
    user: data?.user ?? null,
    permissions: data?.perms ?? null,
  };
}

export async function authenticateUser({ name, pin }) {
  const response = await httpClient("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, pin }),
  });

  const data = await parseJsonResponse(response, null);

  if (!response.ok) {
    const message = data?.message || "Invalid Credentials";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return {
    user: data?.user ?? null,
    permissions: data?.perms ?? null,
  };
}

export async function logoutSession() {
  const response = await httpClient("/auth/logout", {
    method: "POST",
  });

  const data = await parseJsonResponse(response, null);
  if (!response.ok) {
    const message = data?.message || "Logout failed";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}
