"use client";

import {
  Card,
  CardBody,
} from "@heroui/react";
import { AlertCircle } from "lucide-react";

export function NodeError({ error }) {
  return (
    <Card className="mb-6 bg-red-50 border-red-200">
      <CardBody>
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-600 font-semibold">{error}</p>
        </div>
      </CardBody>
    </Card>
  );
}
