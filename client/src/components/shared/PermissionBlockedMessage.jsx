"use client";

import { Card, CardBody } from "@heroui/react";
import { ShieldAlert } from "lucide-react";

export function PermissionBlockedMessage({ title, subtitle }) {
  return (
    <Card shadow="none" className="mb-6 shadow-lg bg-white rounded-lg p-4 lg:p-8">
      <CardBody>
        <div className="text-center py-12">
          <ShieldAlert aria-hidden="true" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-deep mb-2">{title}</h3>
          <p className="text-gray-500">{subtitle}</p>
        </div>
      </CardBody>
    </Card>
  );
}
