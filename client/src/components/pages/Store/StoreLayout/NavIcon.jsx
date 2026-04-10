"use client";

import * as LucideIcons from "lucide-react";

export function NavIcon({ name, className = "w-5 h-5" }) {
  const formatIconName = (iconName) => iconName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  const formattedName = formatIconName(name);
  const IconComponent = LucideIcons[formattedName] || LucideIcons.FileText;
  return <IconComponent className={className} />;
}
