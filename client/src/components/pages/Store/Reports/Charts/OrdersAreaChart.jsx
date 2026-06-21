"use client";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { CHART_COLORS } from "./chartColors";

export function OrdersAreaChart({ ordersPerDay }) {
  const reportsTranslations = useTranslations("reports");

  if (!ordersPerDay.length) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-600 mb-4">{reportsTranslations("charts.ordersOverTime")}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart aria-label={reportsTranslations("charts.ordersOverTime")} data={ordersPerDay} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            scale="linear"
            domain={[0, "auto"]}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            formatter={(count) => [count, reportsTranslations("orders.count")]}
            labelStyle={{ color: "#374151", fontWeight: 600 }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
            cursor={{ fill: "#f3f4f6" }}
          />
          <Bar
            dataKey="orders"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          >
            {ordersPerDay.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % 2]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
