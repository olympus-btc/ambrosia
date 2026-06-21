"use client";
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { CHART_COLORS } from "./chartColors";

export function RevenueAreaChart({ dailyRevenue, formatCurrency }) {
  const reportsTranslations = useTranslations("reports");

  if (!dailyRevenue.length) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-600 mb-4">{reportsTranslations("charts.revenueOverTime")}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart aria-label={reportsTranslations("charts.revenueOverTime")} data={dailyRevenue} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.45} />
              <stop offset="95%" stopColor={CHART_COLORS[2]} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            scale="linear"
            domain={[0, "auto"]}
            tickFormatter={(cents) => formatCurrency(cents)}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            formatter={(revenueInCents) => [formatCurrency(revenueInCents), reportsTranslations("summary.revenue")]}
            labelStyle={{ color: "#374151", fontWeight: 600 }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Area
            type="natural"
            dataKey="revenue"
            stroke={CHART_COLORS[0]}
            strokeWidth={2}
            fill="url(#revenueGradient)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
