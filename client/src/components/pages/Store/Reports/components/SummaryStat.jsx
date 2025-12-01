"use client";
import { Card, CardBody } from "@heroui/react";

export function SummaryStat({ icon, label, value, tone }) {
  return (
    <Card className={`${tone.bg} ${tone.border}`}>
      <CardBody className="text-center p-4">
        <div className={`${tone.iconBg} rounded-full w-12 h-12 mx-auto flex items-center justify-center mb-2`}>
          {icon}
        </div>
        <p className={`${tone.text} text-sm font-medium`}>{label}</p>
        <p className={`${tone.value} text-2xl font-bold mt-1`}>{value}</p>
      </CardBody>
    </Card>
  );
}
