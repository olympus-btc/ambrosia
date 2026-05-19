"use client";
import { Card, CardBody } from "@heroui/react";

import { DateRangeCard } from "./DateRangeCard";

export function FiltersCard({ filters, onFiltersChange, disabled }) {
  return (
    <Card shadow="none" className="shadow-lg bg-white rounded-lg p-4 lg:p-8">
      <CardBody>
        <DateRangeCard filters={filters} onFiltersChange={onFiltersChange} disabled={disabled} />
      </CardBody>
    </Card>
  );
}
