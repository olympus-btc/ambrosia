import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import jwt from "jsonwebtoken";

import { API_URL } from "@/config/api";

const API_BASE_URL = API_URL;

const isSecureRequest = (request) => {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) return forwardedProto === "https";
  const url = new URL(request.url);
  return url.protocol === "https:";
};

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;
    const useSecureCookies = isSecureRequest(request);

    if (!refreshToken) {
      return NextResponse.json(
        { message: "No refresh token found" },
        { status: 401 },
      );
    }

    // Hacer la petición al backend para refrescar el token
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `refreshToken=${refreshToken}`,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { message: errorData || "Token refresh failed" },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Crear la respuesta exitosa
    const nextResponse = NextResponse.json(
      { message: "Token refreshed successfully" },
      { status: 200 },
    );

    // Establecer las nuevas cookies si vienen en la respuesta
    const nowSec = Math.floor(Date.now() / 1000);
    if (data.accessToken) {
      const decodedAccess = jwt.decode(data.accessToken);
      const accessExp = decodedAccess?.exp;
      const accessMaxAge = accessExp ? Math.max(0, accessExp - nowSec) : 60; // fallback 60s
      nextResponse.cookies.set("accessToken", data.accessToken, {
        httpOnly: true,
        secure: useSecureCookies,
        sameSite: "strict",
        maxAge: accessMaxAge,
        path: "/",
      });
    }

    if (data.refreshToken) {
      const decodedRefresh = jwt.decode(data.refreshToken);
      const refreshExp = decodedRefresh?.exp;
      const refreshMaxAge = refreshExp
        ? Math.max(0, refreshExp - nowSec)
        : 30 * 24 * 60 * 60; // fallback 30 días
      nextResponse.cookies.set("refreshToken", data.refreshToken, {
        httpOnly: true,
        secure: useSecureCookies,
        sameSite: "strict",
        maxAge: refreshMaxAge,
        path: "/",
      });
    }

    // Copiar cookies adicionales de la respuesta del backend si las hay
    const setCookieHeaders = response.headers.getSetCookie?.();
    if (setCookieHeaders) {
      setCookieHeaders.forEach((cookie) => {
        const [cookieStr] = cookie.split(";");
        const [name, value] = cookieStr.split("=");
        if (
          name &&
          value &&
          !["accessToken", "refreshToken"].includes(name.trim())
        ) {
          nextResponse.cookies.set(name.trim(), value.trim());
        }
      });
    }

    return nextResponse;
  } catch (error) {
    console.error("Refresh token error:", error);

    const errorResponse = NextResponse.json(
      { message: "Internal server error during token refresh" },
      { status: 500 },
    );

    // Limpiar cookies en caso de error
    errorResponse.cookies.delete("accessToken");
    errorResponse.cookies.delete("refreshToken");

    return errorResponse;
  }
}
