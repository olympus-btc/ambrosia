"use client";
import { useTranslations } from "next-intl";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { CHART_COLORS } from "./chartColors";

export function PaymentMethodPieChart({ paymentMethods, formatCurrency, valueKey = "revenue" }) {
  const reportsTranslations = useTranslations("reports");

  if (!paymentMethods.length) return null;

  const formatValue = (value) => (valueKey === "revenue" ? formatCurrency(value) : value);

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-600 mb-4">{reportsTranslations("charts.paymentSplit")}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart aria-label={reportsTranslations("charts.paymentSplit")}>
          <Pie
            data={paymentMethods}
            dataKey={valueKey}
            nameKey="method"
            cx="50%"
            cy="50%"
            innerRadius="45%"
            outerRadius="70%"
            paddingAngle={3}
          >
            {paymentMethods.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(rawValue, paymentMethodName) => [formatValue(rawValue), paymentMethodName]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Legend
            formatter={(legendLabel) => <span style={{ fontSize: 12, color: "#374151" }}>{legendLabel}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
