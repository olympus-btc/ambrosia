"use client";

import { Button } from "@heroui/react";
import { Trash } from "lucide-react";

export function DeleteButton({ onPress, children, size = "sm" }) {
  return (
    <Button
      className={`border border-red-600 text-red-600 ${children ? "" : "w-8 min-w-0 px-0"}`}
      onPress={onPress}
      size={size}
      variant="outline"
    >
      <Trash className="w-4 h-4" />
      {children}
    </Button>
  );
}
