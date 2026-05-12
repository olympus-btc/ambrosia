"use client";
import { DollarSign, Bitcoin, CreditCard, Banknote } from "lucide-react";

const paymentStyles = {
  efectivo: {
    bg: "bg-green-100",
    text: "text-green-800",
    icon: <Banknote className="w-4 h-4" />,
  },
  btc: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    icon: <Bitcoin className="w-4 h-4" />,
  },
  bitcoin: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    icon: <Bitcoin className="w-4 h-4" />,
  },
  "tarjeta de débito": {
    bg: "bg-blue-100",
    text: "text-blue-800",
    icon: <CreditCard className="w-4 h-4" />,
  },
  debito: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    icon: <CreditCard className="w-4 h-4" />,
  },
  "tarjeta de crédito": {
    bg: "bg-purple-100",
    text: "text-purple-800",
    icon: <CreditCard className="w-4 h-4" />,
  },
  credito: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    icon: <CreditCard className="w-4 h-4" />,
  },
};

export function PaymentBadge({ method }) {
  const key = method?.toLowerCase?.() || "otro";
  const style = paymentStyles[key] || {
    bg: "bg-gray-100",
    text: "text-gray-800",
    icon: <DollarSign className="w-4 h-4" />,
  };

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
      {style.icon}
      <span className="capitalize">{method || "Desconocido"}</span>
    </div>
  );
}
