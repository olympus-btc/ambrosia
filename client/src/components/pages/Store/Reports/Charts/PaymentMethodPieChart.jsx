"use client";
import { useTranslations } from "next-intl";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#1c7c54", "#59bd8d", "#9ed8bc", "#c5e7d7", "#46985d"];

export function PaymentMethodPieChart({ paymentMethods, formatCurrency }) {
  const t = useTranslations("reports");

  if (!paymentMethods.length) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-600 mb-4">{t("charts.paymentSplit")}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart aria-label={t("charts.paymentSplit")}>
          <Pie
            data={paymentMethods}
            dataKey="revenue"
            nameKey="method"
            cx="50%"
            cy="50%"
            innerRadius="45%"
            outerRadius="70%"
            paddingAngle={3}
          >
            {paymentMethods.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [formatCurrency(value), name]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Legend
            formatter={(value) => <span style={{ fontSize: 12, color: "#374151" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
