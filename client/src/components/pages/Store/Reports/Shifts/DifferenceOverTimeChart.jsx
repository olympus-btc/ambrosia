"use client";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { differenceBarColor } from "./utils/differenceTone";

export function DifferenceOverTimeChart({ differenceByDay, formatCurrency }) {
  const reportsTranslations = useTranslations("reports");

  if (!differenceByDay.length) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-600 mb-4">{reportsTranslations("shiftsReport.differenceOverTime")}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          aria-label={reportsTranslations("shiftsReport.differenceOverTime")}
          data={differenceByDay}
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={(tickAmount) => formatCurrency(tickAmount)}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            formatter={(tooltipAmount) => [formatCurrency(tooltipAmount), reportsTranslations("shiftsReport.difference")]}
            labelStyle={{ color: "#374151", fontWeight: 600 }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Bar dataKey="difference" radius={[4, 4, 0, 0]} maxBarSize={32}>
            {differenceByDay.map((entry, index) => (
              <Cell key={index} fill={differenceBarColor(entry.difference)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
