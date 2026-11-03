"use client";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { CHART_COLORS } from "../../../Store/Reports/Charts/chartColors";
import { formatInvoiceDuration } from "../../Invoices/invoiceFormatters";

const BAR_HEIGHT = 32;
const MIN_CHART_HEIGHT = 120;

export function DurationBarChart({ title, durations }) {
  const reportTranslations = useTranslations("freelanceReports");

  if (!durations.length) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-600 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={Math.max(MIN_CHART_HEIGHT, durations.length * BAR_HEIGHT)}>
        <BarChart aria-label={title} data={durations} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatInvoiceDuration}
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
            width={120}
          />
          <Tooltip
            formatter={(durationMinutes) => [formatInvoiceDuration(durationMinutes), reportTranslations("duration")]}
            labelStyle={{ color: "#374151", fontWeight: 600 }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Bar dataKey="durationMinutes" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {durations.map((_, durationIndex) => (
              <Cell key={durationIndex} fill={durationIndex === 0 ? CHART_COLORS[0] : CHART_COLORS[2]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
