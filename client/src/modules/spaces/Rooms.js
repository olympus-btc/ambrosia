"use client";
import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Badge,
  Spinner,
  addToast } from "@heroui/react";
import { ChefHat, Home, Users, ArrowRight } from "lucide-react";

import { getRooms } from "./spacesService";

export default function Rooms() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchRooms() {
      try {
        setIsLoading(true);
        let response = await getRooms();
        if (response === undefined) {
          response = 0;
        }
        setRooms(response);
      } catch (error) {
        console.error(error.message);
        setError("Error al cargar las salas");
        addToast({
          title: "Error",
          description: "No se pudieron cargar las salas",
          variant: "solid",
          color: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchRooms();
  }, []);

  const handleRoomClick = (room) => {
    router.push(`/tables/${room.id}`);
  };

  const isEmptyObject =
    typeof rooms === "object" &&
    rooms !== null &&
    Object.keys(rooms).length === 0;

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardBody className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" color="success" />
            <p className="text-lg font-semibold text-deep mt-4">
              Cargando salas...
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error && (rooms.length === 0 || isEmptyObject)) {
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <Card className="mb-6 shadow-lg border-0 bg-white">
          <CardHeader className="text-center pb-4">
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
                  <ChefHat className="w-6 h-6 text-forest" />
                </div>
                <h1 className="text-2xl font-bold text-deep">
                  Espacios del Restaurante
                </h1>
                <p className="text-forest text-sm">
                  Selecciona un espacio para ver sus mesas
                </p>
              </div>
              <div className="w-20" /> {/* Spacer for centering */}
            </div>
          </CardHeader>
        </Card>

        {/* Rooms Grid */}
        {rooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rooms.map((room) => (
              <Card
                key={room.id}
                className="shadow-lg border-0 bg-white hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-[1.02]"
                isPressable
                onPress={() => handleRoomClick(room)}
              >
                <CardBody className="p-6 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    {/* Room Icon */}
                    <div className="w-16 h-16 bg-mint rounded-full flex items-center justify-center">
                      <Home className="w-8 h-8 text-forest" />
                    </div>

                    {/* Room Name */}
                    <h3 className="text-lg font-bold text-deep">{room.name}</h3>

                    {/* Room Description */}
                    {room.description && (
                      <p className="text-sm text-forest text-center">
                        {room.description}
                      </p>
                    )}

                    {/* Tables Count Badge */}
                    {room.tables_count && (
                      <Badge
                        color="primary"
                        variant="flat"
                        className="px-3 py-1"
                      >
                        {room.tables_count}{" "}
                        {room.tables_count === 1 ? "mesa" : "mesas"}
                      </Badge>
                    )}

                    {/* Capacity if available */}
                    {room.capacity && (
                      <div className="flex items-center text-sm text-forest">
                        <Users className="w-4 h-4 mr-1" />
                        Capacidad: {room.capacity} personas
                      </div>
                    )}

                    {/* Action hint */}
                    <div className="flex items-center text-xs text-gray-500 mt-2">
                      <span>Toca para ver mesas</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-lg border-0 bg-white">
            <CardBody className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-deep mb-2">
                No hay espacios disponibles
              </h3>
              <p className="text-gray-500 mb-6">
                Agrega tu primer espacio desde la página{" "}
                <span className="font-bold text-forest">
                  Administrar espacios
                </span>
              </p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
