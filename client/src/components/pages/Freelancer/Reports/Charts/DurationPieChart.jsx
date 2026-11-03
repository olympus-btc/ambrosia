"use client";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { CHART_COLORS } from "../../../Store/Reports/Charts/chartColors";
import { formatInvoiceDuration } from "../../Invoices/invoiceFormatters";

export function DurationPieChart({ title, durations }) {
  if (!durations.length) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-600 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart aria-label={title}>
          <Pie
            data={durations}
            dataKey="durationMinutes"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="45%"
            outerRadius="70%"
            paddingAngle={3}
          >
            {durations.map((_, durationIndex) => (
              <Cell key={durationIndex} fill={CHART_COLORS[durationIndex % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(durationMinutes, durationName) => [formatInvoiceDuration(durationMinutes), durationName]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Legend formatter={(legendLabel) => <span style={{ fontSize: 12, color: "#374151" }}>{legendLabel}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
