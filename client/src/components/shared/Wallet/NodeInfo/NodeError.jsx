"use client";

import {
  Card,
  CardBody,
} from "@heroui/react";
import { AlertCircle } from "lucide-react";

export function NodeError({ error }) {
  return (
    <Card className="rounded-lg mb-6 p-6">
      <CardBody className="p-0">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-red-600 font-semibold">{error}</p>
        </div>
      </CardBody>
    </Card>
  );
}
