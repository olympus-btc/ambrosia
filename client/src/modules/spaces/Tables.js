"use client";
import { useState, useEffect } from "react";
import { getTablesByRoomId } from "./spacesService";
import { ChefHat, Coffee, Users, ArrowLeft } from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Badge,
  Spinner,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { createOrder } from "../orders/ordersService";
import { updateTable } from "./spacesService";
import { addToast } from "@heroui/react";
import { useAuth } from "../auth/useAuth";

export default function Tables({ dynamicParams }) {
  const roomId = dynamicParams?.roomId;
  const router = useRouter();
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomName, setRoomName] = useState("Sala");
  const { user } = useAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        if (!roomId) {
          setError("ID de sala no válido");
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        const tablesResponse = await getTablesByRoomId(roomId);
        setTables(tablesResponse);

        // Obtener nombre de la sala si está disponible
        if (tablesResponse.length > 0 && tablesResponse[0].room_name) {
          setRoomName(tablesResponse[0].room_name);
        }
      } catch (error) {
        console.error(error.message);
        setError("Error al cargar las mesas");
        addToast({
          title: "Error",
          description: "No se pudieron cargar las mesas",
          variant: "solid",
          color: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [roomId]);

  const handleTableClick = async (table) => {
    if (table.status === "available") {
      try {
        const orderResponse = await createOrder(table.id, user.user_id);
        if (orderResponse.id) {
          const updatedTables = tables.map((t) =>
            t.id === table.id
              ? { ...t, status: "occupied", order_id: orderResponse.id }
              : t,
          );
          setTables(updatedTables);

          // Actualizar en servidor
          await updateTable({
            ...table,
            status: "occupied",
            order_id: orderResponse.id,
          });

          addToast({
            title: "Mesa Abierta",
            description: `Mesa ${table.name} abierta exitosamente`,
            color: "success",
          });

          router.push(`/modify-order/${orderResponse.id}?isNew=true`);
        }
      } catch (error) {
        console.error(error.message);
        addToast({
          title: "Error",
          description: "No se pudo abrir la mesa",
          variant: "solid",
          color: "danger",
        });
      }
    } else if (table.status === "occupied") {
      router.push(`/modify-order/${table.order_id}`);
    }
  };

  const getTableStatusColor = (status) => {
    switch (status) {
      case "available":
        return "success";
      case "occupied":
        return "danger";
      default:
        return "default";
    }
  };

  const getTableStatusText = (status) => {
    switch (status) {
      case "available":
        return "Disponible";
      case "occupied":
        return "Ocupada";
      default:
        return "Desconocido";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardBody className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" color="success" />
            <p className="text-lg font-semibold text-deep mt-4">
              Cargando mesas...
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error) {
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
              onPress={() => router.push("/spaces")}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Espacios
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
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver
              </Button>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-mint rounded-full flex items-center justify-center mb-2">
                  <Coffee className="w-6 h-6 text-forest" />
                </div>
                <h1 className="text-2xl font-bold text-deep">{roomName}</h1>
                <p className="text-forest text-sm">
                  {tables.length} {tables.length === 1 ? "mesa" : "mesas"}{" "}
                  disponibles
                </p>
              </div>
              <div className="w-20" /> {/* Spacer for centering */}
            </div>
          </CardHeader>
        </Card>

        {/* Tables Grid */}
        {Array.isArray(tables) && tables.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map((table) => (
              <Card
                key={table.id}
                className="shadow-lg border-0 bg-white hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-[1.02]"
                isPressable
                onPress={() => handleTableClick(table)}
              >
                <CardBody className="p-6 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    {/* Table Icon */}
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        table.status === "available"
                          ? "bg-green-100"
                          : "bg-red-100"
                      }`}
                    >
                      <Users
                        className={`w-8 h-8 ${
                          table.status === "available"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      />
                    </div>

                    {/* Table Name */}
                    <h3 className="text-lg font-bold text-deep">
                      {table.name}
                    </h3>

                    {/* Status Badge */}
                    <Badge
                      color={getTableStatusColor(table.status)}
                      variant="flat"
                      className="px-3 py-1"
                      content={getTableStatusText(table.status)}
                    />

                    {/* Capacity if available */}
                    {table.capacity && (
                      <p className="text-sm text-forest">
                        Capacidad: {table.capacity} personas
                      </p>
                    )}

                    {/* Action hint */}
                    <p className="text-xs text-gray-500 mt-2">
                      {table.status === "available"
                        ? "Toca para abrir mesa"
                        : "Toca para ver orden"}
                    </p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-lg border-0 bg-white">
            <CardBody className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-deep mb-2">
                No hay mesas disponibles
              </h3>
              <p className="text-gray-500 mb-6">
                Esta sala no tiene mesas configuradas
              </p>
              <Button
                variant="outline"
                color="primary"
                onPress={() => router.push("/spaces")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a Espacios
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
