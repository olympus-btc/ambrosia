"use client";

import { useState } from "react";
import { StoreLayout } from "../StoreLayout";

const USERS = [
  {
    id: 1,
    name: "Jordano Anaya",
    role: "Cajero",
    email: "jordipirata@ambrosia.dev",
    phone: "4431342288",
    status: "Activo",
  },
  {
    id: 2,
    name: "Alberto Vidarte",
    role: "Almacen",
    email: "betornillo@ambrosia.dev",
    phone: "4431236969",
    status: "Activo",
  },
  {
    id: 3,
    name: "Carlos Ruz",
    role: "Supervisor",
    email: "carlosruz@ambrosia.dev",
    phone: "4431342288",
    status: "Activo",
  },
];

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <StoreLayout>
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-green-900">Usuarios</h1>
          <p className="text-sm text-gray-700">
            Gestiona el personal de tu tienda
          </p>
        </div>

        <button
          className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          onClick={() => setShowModal(true)}
        >
          Agregar Usuario
        </button>
      </header>

      {/* Table */}
      <section className="bg-[#f5ffe9] rounded-lg shadow border border-green-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-green-600 text-white text-left">
              <th className="py-2 px-3">Nombre</th>
              <th className="py-2 px-3">Rol</th>
              <th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Teléfono</th>
              <th className="py-2 px-3">Estado</th>
              <th className="py-2 px-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {USERS.map((u, idx) => (
              <tr
                key={u.id}
                className={idx % 2 === 0 ? "bg-[#f5ffe9]" : "bg-[#ecf7e2]"}
              >
                <td className="py-2 px-3">{u.name}</td>
                <td className="py-2 px-3">
                  <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 border border-green-200">
                    {u.role}
                  </span>
                </td>
                <td className="py-2 px-3">{u.email}</td>
                <td className="py-2 px-3">{u.phone}</td>
                <td className="py-2 px-3">
                  <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 border border-green-200">
                    {u.status}
                  </span>
                </td>
                <td className="py-2 px-3 text-right space-x-2">
                  <button className="text-xs text-gray-600 hover:text-green-800">
                    ✏️
                  </button>
                  <button className="text-xs text-gray-600 hover:text-red-700">
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Modal: Agregar Usuario */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl rounded-lg bg-[#f5ffe9] shadow-xl border border-green-200 p-6">
            <h2 className="text-xl font-semibold text-green-900 mb-4">
              Agregar Usuario
            </h2>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setShowModal(false);
              }}
            >
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  className="w-full rounded border border-green-200 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full rounded border border-green-200 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Rol</label>
                <select className="w-full rounded border border-green-200 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-green-400">
                  <option>Vendedor</option>
                  <option>Cajero</option>
                  <option>Supervisor</option>
                  <option>Almacén</option>
                </select>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  className="rounded-full border border-green-400 px-6 py-2 text-sm font-medium text-green-800 bg-transparent hover:bg-green-50"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StoreLayout>
  );
}
