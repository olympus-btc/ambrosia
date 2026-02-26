"use client";

import React from "react";

import { useRouter } from "next/navigation";

import { Card, CardBody, CardHeader, Button } from "@heroui/react";
import { ChefHat, Lock, Home } from "lucide-react";

const UnauthorizedPage = () => {
  const router = useRouter();

  const handleGoHome = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white mx-auto my-auto">
        <CardHeader className="text-center space-y-3 pb-4 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center justify-center">
            <div className="mx-auto w-16 h-16 bg-mint rounded-full flex items-center justify-center shadow-lg">
              <ChefHat className="w-8 h-8 text-forest" />
            </div>
            <div className="flex flex-col items-center justify-center">
              <h1 className="text-2xl font-bold text-deep">
                Restaurante Verde
              </h1>
              <p className="text-forest mt-2 text-base text-center">
                Acceso no autorizado
              </p>
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-6 px-6 pb-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-red-500" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-deep">
                Sin Permisos de Acceso
              </h2>
              <p className="text-forest text-base leading-relaxed">
                No tienes los permisos necesarios para acceder a esta página.
                Por favor, contacta al administrador del sistema.
              </p>
            </div>
          </div>

          <Button
            onPress={handleGoHome}
            size="md"
            className="w-full h-14 text-lg font-bold gradient-forest text-white shadow-lg active:scale-95 transition-all duration-200 border-0"
          >
            <Home className="w-5 h-5 mr-2" />
            Volver al Inicio
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;
