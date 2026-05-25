"use client";
import { Card, CardBody } from "@heroui/react";

export function SummaryStat({ label, value, tone }) {
  return (
    <Card className={`${tone.bg} ${tone.border} border`}>
      <CardBody className="flex flex-col items-center justify-center p-4 text-center">
        <p className={`${tone.text} text-xs font-medium mb-1`}>{label}</p>
        <p className={`${tone.value} text-2xl font-bold`}>{value}</p>
      </CardBody>
    </Card>
  );
}
