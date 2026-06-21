"use client";
import { SummaryStat } from "./SummaryStat";

const TONE = {
  bg: "bg-white",
  border: "border-default-100",
  text: "text-forest",
  value: "text-deep",
};

export function SummaryCard({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value }) => (
        <SummaryStat key={label} label={label} value={value} tone={TONE} />
      ))}
    </div>
  );
}
