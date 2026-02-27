"use client";
import Link from "next/link";

import { useModules } from "../../hooks/useModules";
import LoadingCard from "../LoadingCard";

export function DynamicNavigation() {
  const { availableNavigation, isAuthenticated, isAdmin, isLoading } = useModules();

  if (isLoading) {
    return <LoadingCard message="Cargando navegación..." fullScreen={false} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <p className="text-gray-500">Inicia sesión para ver el menú</p>
      </div>
    );
  }

  return (
    <nav className="p-4">
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Usuario: {isAdmin ? "Administrador" : "Usuario"}
          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
            {isAdmin ? "Admin" : "User"}
          </span>
        </p>
      </div>

      <ul className="space-y-2">
        {availableNavigation.map((navItem) => (
          <li key={navItem.path}>
            <Link
              href={navItem.path}
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium">{navItem.label}</span>
              {navItem.roles?.includes("admin") && (
                <span className="text-xs px-1 py-0.5 bg-red-100 text-red-600 rounded">
                  Admin
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {availableNavigation.length === 0 && (
        <p className="text-gray-500 text-sm">
          No hay módulos disponibles para tu rol
        </p>
      )}
    </nav>
  );
}
