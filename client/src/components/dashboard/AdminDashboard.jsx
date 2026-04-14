"use client";
import { useModules } from "../../hooks/useModules";

export function AdminDashboard() {
  const { availableModules, isAdmin, isAuthenticated } = useModules();

  if (!isAuthenticated) {
    return <div>Debes iniciar sesión</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin ? "Panel de Administrador" : "Panel de Usuario"}
        </h1>
        <p className="text-gray-600">
          Módulos disponibles para tu rol
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(availableModules).map(([moduleKey, moduleConfig]) => (
          <div key={moduleKey} className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {moduleConfig.name}
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Rutas disponibles:</p>
              <ul className="text-sm space-y-1">
                {moduleConfig.routes.map((route) => (
                  <li key={route.path} className="flex items-center justify-between">
                    <span>{route.path}</span>
                    <div className="flex space-x-1">
                      {route.requiresAuth && (
                        <span className="px-1 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                          Auth
                        </span>
                      )}
                      {route.requiresAdmin && (
                        <span className="px-1 py-0.5 text-xs bg-red-100 text-red-600 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {moduleConfig.navItems && moduleConfig.navItems.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Navegación:</p>
                <div className="flex flex-wrap gap-1">
                  {moduleConfig.navItems.map((navItem) => (
                    <span
                      key={navItem.path}
                      className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded"
                    >
                      {navItem.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {Object.keys(availableModules).length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No tienes acceso a ningún módulo con tu rol actual
          </p>
        </div>
      )}
    </div>
  );
}
