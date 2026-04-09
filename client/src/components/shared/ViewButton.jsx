"use client";

import { Button } from "@heroui/react";
import { Eye } from "lucide-react";

export function ViewButton({ onPress, children, size = "sm" }) {
  return (
    <Button
      className={`border border-green-800 text-green-800 ${children ? "w-8 min-w-0 px-0 sm:w-auto sm:min-w-16 sm:px-3" : "w-8 min-w-0 px-0"}`}
      onPress={onPress}
      size={size}
      variant="outline"
    >
      <Eye className="w-4 h-4" />
      {children && <span className="hidden sm:inline">{children}</span>}
    </Button>
  );
}
