"use client";
import { DollarSign, Bitcoin, CreditCard, Banknote } from "lucide-react";
import { useTranslations } from "next-intl";

const paymentStyles = {
  cash: {
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
  debit: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    icon: <CreditCard className="w-4 h-4" />,
  },
  credit: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    icon: <CreditCard className="w-4 h-4" />,
  },
};

export function PaymentBadge({ method }) {
  const t = useTranslations("reports");
  const key = method?.toLowerCase?.() || "other";
  const style = paymentStyles[key] || {
    bg: "bg-gray-100",
    text: "text-gray-800",
    icon: <DollarSign className="w-4 h-4" />,
  };

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
      {style.icon}
      <span className="capitalize">{method || t("payment.unknown")}</span>
    </div>
  );
}
