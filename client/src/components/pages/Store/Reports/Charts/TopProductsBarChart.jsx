"use client";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { CHART_COLORS } from "./chartColors";

export function TopProductsBarChart({ products, formatCurrency }) {
  const reportsTranslations = useTranslations("reports");

  if (!products.length) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-600 mb-4">{reportsTranslations("charts.topProducts")}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart aria-label={reportsTranslations("charts.topProducts")} data={products} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(cents) => formatCurrency(cents)}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#374151" }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            formatter={(revenueInCents) => [formatCurrency(revenueInCents), reportsTranslations("summary.revenue")]}
            labelStyle={{ color: "#374151", fontWeight: 600 }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {products.map((_, index) => (
              <Cell key={index} fill={index === 0 ? CHART_COLORS[0] : CHART_COLORS[2]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
